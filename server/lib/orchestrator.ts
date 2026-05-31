import type { DB } from "./db.js";
import { saveRun } from "./db.js";
import { providerForModel, type ProviderResult } from "./providers.js";
import { totalCostUsd } from "./pricing.js";

type ChatBody = {
  messages: { who: "user" | "assistant"; text: string }[];
  selectedModels: string[];
  params: { temperature: number; maxTokens: number; timeoutSec: number; tools: boolean; safety: boolean; showWork: boolean; rounds: number; minDurationSec: number; debate: boolean; costCapUsd: number };
};

export async function orchestrateChat({ db, body, onEvent }: { db: DB; body: ChatBody; onEvent: (event: string, data: unknown) => void }) {
  const userPrompt = lastUserMessage(body.messages).trim();
  const models = body.selectedModels.filter(Boolean).slice(0, 5);
  if (models.length === 0) {
    onEvent("error", { message: "No models selected" });
    return;
  }

  const startedAt = Date.now();
  const errors: { model: string; message: string }[] = [];
  const rounds: { index: number; candidates: ProviderResult[] }[] = [];
  // Every successful call in every round, used for the cost estimate.
  const allResults: ProviderResult[] = [];

  // Multi-round: generate -> (optional debate/critique) -> revise -> score
  for (let round = 1; round <= body.params.rounds; round++) {
    onEvent("status", { stage: "dispatch", models, round, totalRounds: body.params.rounds });
    const results: ProviderResult[] = [];

    await Promise.all(models.map(async (modelId) => {
      try {
        const call = providerForModel[modelId];
        if (!call) throw new Error(`No provider for ${modelId}`);
        const contextMessages = buildRoundMessages(body.messages, rounds, body.params.debate);
        const resp = await call({
          db,
          modelId,
          messages: contextMessages,
          temperature: body.params.temperature,
          maxTokens: body.params.maxTokens,
          timeoutMs: body.params.timeoutSec * 1000
        });
        results.push(resp);
        onEvent("partial", { model: modelId, text: resp.text, round });
      } catch (err) {
        const message = (err as Error).message;
        errors.push({ model: modelId, message });
        onEvent("partial", { model: modelId, error: message, round });
      }
    }));

    onEvent("status", { stage: "evaluate", count: results.length, round });
    allResults.push(...results);
    const ok = results.filter(r => r && typeof r.text === 'string' && r.text.trim().length > 0);
    const ranked = rankByHeuristics(userPrompt, ok);
    rounds.push({ index: round, candidates: ranked });

    // Soft cost cap: stop launching further rounds once the running token
    // spend exceeds the user's budget. The current round still completes.
    if (body.params.costCapUsd > 0 && totalCostUsd(allResults) >= body.params.costCapUsd) {
      onEvent("status", { stage: "cost-cap", round, costUsd: totalCostUsd(allResults), capUsd: body.params.costCapUsd });
      break;
    }

    // If we have a minimum duration, wait until time budget is met
    const elapsed = (Date.now() - startedAt) / 1000;
    if (round === body.params.rounds && elapsed < body.params.minDurationSec) {
      const delayMs = (body.params.minDurationSec - elapsed) * 1000;
      await sleep(delayMs);
    }
  }

  onEvent("status", { stage: "synthesize" });
  const latest = rounds[rounds.length - 1]?.candidates ?? [];
  const synthesized = synthesizeAnswer(userPrompt, latest, errors);

  // Cost estimate across every round. Stored as cents; kept fractional so
  // sub-cent runs (a few hundred tokens) don't collapse to $0.00. SQLite's
  // dynamic typing stores the float fine in the `cost_cents` column.
  const costUsd = totalCostUsd(allResults);
  const costCents = costUsd * 100;

  // persist run
  try {
    saveRun(db, { prompt: userPrompt, models, finalText: synthesized, candidates: latest, costCents, status: "done" });
  } catch (err) {
    console.error("[orchestrator] failed to persist run", err);
  }

  onEvent("final", { text: synthesized, candidates: latest, errors, costUsd, rounds: rounds.map(r => ({ round: r.index, top: r.candidates[0]?.text ?? "" })) });
}

function lastUserMessage(messages: { who: "user" | "assistant"; text: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.who === "user") return messages[i]!.text;
  }
  return messages[messages.length - 1]?.text ?? "";
}

export function rankByHeuristics(prompt: string, results: ProviderResult[]): ProviderResult[] {
  // Simple heuristic: prefer longer but not too long, penalize repeated tokens
  const scored = results.map(r => ({
    result: r,
    score: scoreText(prompt, r.text)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.result);
}

function scoreText(prompt: string, text: string): number {
  const len = Math.min(text.length, 4000);
  const coverage = jaccardSimilarity(tokens(prompt), tokens(text));
  const repetitionPenalty = repetitionRate(text);
  return coverage * 2 + len / 4000 - repetitionPenalty;
}

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

export function repetitionRate(text: string): number {
  const words = text.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
  if (words.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  return Math.max(0, (maxFreq / words.length) - 0.05);
}

function buildRoundMessages(base: { who: "user" | "assistant"; text: string }[], history: { index: number; candidates: ProviderResult[] }[], debate: boolean) {
  const msgs: { role: "user" | "assistant"; content: string }[] = base.map(m => ({ role: m.who === "assistant" ? "assistant" : "user", content: m.text }));
  if (history.length === 0) return msgs;
  const last = history[history.length - 1]!;
  const best = last.candidates[0]?.text ?? "";

  // Iterative refinement. The model silently critiques the prior draft (and an
  // alternate, when debating), then returns ONLY the improved standalone answer.
  // The critique must NOT leak into the user-facing output — early versions of
  // this prompt produced answers like "The original answer is correct, but...".
  let refine =
    `You previously drafted an answer to the user's request. Improve it.\n\n` +
    `--- Your previous draft ---\n${best}\n--- End previous draft ---`;
  if (debate && last.candidates.length > 1) {
    const alt = last.candidates[1]?.text ?? "";
    refine +=
      `\n\n--- Another model's draft (for reference) ---\n${alt}\n--- End other draft ---\n\n` +
      `Silently compare the two drafts and fold in whatever makes the answer stronger.`;
  }
  refine +=
    `\n\nReturn ONLY the final, improved answer to the user's original request. ` +
    `Do not mention drafts, critiques, revisions, or this instruction. ` +
    `Do not add prefaces like "Revised answer:". Just write the best possible answer directly.`;

  msgs.push({ role: "user", content: refine });
  return msgs;
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
function synthesizeAnswer(prompt: string, ranked: ProviderResult[], errors: { model: string; message: string }[] = []): string {
  if (!ranked.length) {
    const errText = errors.length ? `\n\nErrors: ${errors.map(e => `${e.model}: ${e.message}`).join("; ")}` : "";
    return ("I couldn't retrieve results from any selected model. Please check API keys in Settings and try again." + errText).trim();
  }
  const top = ranked[0]!.text.trim();
  // If top is reasonably complete, return it. Otherwise, lightly blend top-2.
  if (top.split(/\s+/).length > 12 || ranked.length === 1) return top;
  const second = ranked[1]?.text ?? "";
  return `${top}\n\nAdditional perspective: ${second}`.trim();
}


