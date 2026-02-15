import type { DB } from "./db.js";
import { providerForModel, type ProviderResult } from "./providers.js";
import { getKey } from "./keys.js";

export type CodegenInput = {
  spec: string;
  files: { path: string; instruction: string }[];
  selectedModels?: string[];
  params?: { rounds?: number; temperature?: number; maxTokens?: number; timeoutSec?: number };
};

export async function generateProjectFiles(db: DB, input: CodegenInput, onProgress?: (ev: { type: string; data: unknown }) => void): Promise<{ path: string; content: string }[]> {
  const rounds = clamp(input.params?.rounds ?? 3, 1, 6);
  const temperature = clampFloat(input.params?.temperature ?? 0.4, 0, 1);
  const maxTokens = clamp(input.params?.maxTokens ?? 2048, 256, 8192);
  const timeoutMs = clamp(input.params?.timeoutSec ?? 60, 10, 300) * 1000;

  const providerModel = pickProviderModel(db, input.selectedModels);
  if (!providerModel) throw new Error("No available provider key. Add an API key in Settings.");

  const results: { path: string; content: string }[] = [];

  for (const [index, file] of input.files.entries()) {
    onProgress?.({ type: "file", data: { index, path: file.path } });
    let draft = "";
    let critique = "";
    for (let r = 1; r <= rounds; r++) {
      const messages = buildCodegenMessages(input.spec, file, draft, critique);
      const call = providerForModel[providerModel];
      const resp: ProviderResult = await call({ db, modelId: providerModel, messages, temperature, maxTokens, timeoutMs });
      const cleaned = stripCodeFence(resp.text).trim();
      if (r === rounds) {
        draft = cleaned;
        break;
      }
      // Ask for critique before next round
      const critiqueMsgs = [
        { role: "user" as const, content: `Critique the following draft for ${file.path}. List concrete issues and improvements only.\n\n${cleaned}` }
      ];
      const respCrit = await call({ db, modelId: providerModel, messages: critiqueMsgs, temperature: 0.2, maxTokens: Math.min(1024, maxTokens), timeoutMs });
      critique = stripCodeFence(respCrit.text).trim();
      draft = cleaned;
      onProgress?.({ type: "round", data: { path: file.path, round: r } });
    }

    results.push({ path: file.path, content: draft });
  }

  return results;
}

export async function planProjectFiles(db: DB, spec: string, selected?: string[]): Promise<{ path: string; instruction: string }[]> {
  const providerModel = pickProviderModel(db, selected);
  if (!providerModel) throw new Error("No available provider key. Add an API key in Settings.");
  const call = providerForModel[providerModel];
  const prompt = `You are a project planner. Given an app spec, output ONLY a compact JSON array of file plans. Each item: { "path": string, "instruction": string }. Do not include code blocks or commentary.\n\nSpec:\n${spec}\n\nReturn JSON:`;
  const resp = await call({ db, modelId: providerModel, messages: [{ role: "user", content: prompt }], temperature: 0.2, maxTokens: 1200, timeoutMs: 60000 });
  const text = resp.text.trim();
  const json = tryParseJsonArray(text);
  if (Array.isArray(json)) {
    return json.filter(isPlan).slice(0, 50);
  }
  // Fallback minimal plan
  return [
    { path: "README.md", instruction: "Project overview and setup" },
    { path: "src/index.ts", instruction: "Entry point" }
  ];
}

function tryParseJsonArray(s: string): any[] | null {
  try {
    const cleaned = s.replace(/^```[\s\S]*?\n|```$/g, "");
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function isPlan(x: any): x is { path: string; instruction: string } {
  return x && typeof x.path === 'string' && typeof x.instruction === 'string';
}

function buildCodegenMessages(spec: string, file: { path: string; instruction: string }, draft: string, critique: string) {
  const sys = `You are a senior software engineer. Produce only the file content for the requested path.\n- Follow the app spec and file instruction.\n- No surrounding commentary.\n- If dependencies are needed, include them in code comments at top.\n- Keep code self-contained and readable.`;
  const msgs: { role: "user" | "assistant"; content: string }[] = [
    { role: "assistant", content: sys },
    { role: "user", content: `App spec:\n\n${spec}` },
    { role: "user", content: `Target file: ${file.path}\nInstruction: ${file.instruction}` }
  ];
  if (draft) msgs.push({ role: "assistant", content: `Previous draft:\n\n${draft}` });
  if (critique) msgs.push({ role: "assistant", content: `Critique of previous draft:\n\n${critique}` });
  msgs.push({ role: "user", content: `Now produce the complete file content for ${file.path}. Do not include backticks.` });
  return msgs;
}

function stripCodeFence(s: string): string {
  const fence = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/m;
  const m = s.match(fence);
  if (m) return m[1];
  return s;
}

function pickProviderModel(db: DB, selected?: string[]): string | null {
  // Prefer explicit selection if any
  if (selected && selected.length > 0) return selected[0]!;
  if (getKey(db, "OPENAI_API_KEY")) return "openai:gpt-4o";
  if (getKey(db, "ANTHROPIC_API_KEY")) return "anthropic:claude-3.5-sonnet";
  if (getKey(db, "GOOGLE_API_KEY")) return "google:gemini-2.5-pro";
  return null;
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function clampFloat(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }


