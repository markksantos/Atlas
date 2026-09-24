import type { ProviderResult } from "./providers.js";

/**
 * Per-model pricing in USD per 1M tokens, keyed by the catalog model id
 * (`provider:model`). Only models with published, stable list prices are
 * included; everything else falls through to `undefined` and contributes $0
 * to the estimate (we'd rather under-report than invent a number).
 *
 * Mirrors the public OpenAI and Anthropic price lists. Update alongside the UI
 * catalog in client/src/atlas-single-file.tsx.
 */
const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai:gpt-5": { input: 0.625, output: 5.0 },
  "openai:gpt-5-mini": { input: 0.125, output: 1.0 },
  "openai:gpt-5-nano": { input: 0.025, output: 0.2 },
  "openai:gpt-4.1": { input: 1.0, output: 4.0 },
  "openai:gpt-4.1-mini": { input: 0.2, output: 0.8 },
  "openai:gpt-4.1-nano": { input: 0.05, output: 0.2 },
  "openai:gpt-4o": { input: 1.25, output: 5.0 },
  "openai:gpt-4o-2024-05-13": { input: 2.5, output: 7.5 },
  "openai:gpt-4o-mini": { input: 0.075, output: 0.3 },
  "openai:o1": { input: 7.5, output: 30.0 },
  "openai:o1-pro": { input: 75.0, output: 300.0 },
  "openai:o3-pro": { input: 10.0, output: 40.0 },
  "openai:o3": { input: 1.0, output: 4.0 },
  "openai:o3-deep-research": { input: 5.0, output: 20.0 },
  "openai:o4-mini": { input: 0.55, output: 2.2 },
  "openai:o4-mini-deep-research": { input: 1.0, output: 4.0 },
  "openai:o3-mini": { input: 0.55, output: 2.2 },
  "openai:o1-mini": { input: 0.55, output: 2.2 },
  "anthropic:claude-fable-5-1": { input: 10.0, output: 50.0 },
  "anthropic:claude-opus-5-5": { input: 4.0, output: 20.0 },
  "anthropic:claude-sonnet-5": { input: 2.0, output: 10.0 },
  "anthropic:claude-haiku-4-5": { input: 1.0, output: 5.0 }
};

/** USD cost of a single provider result based on its reported token usage. */
export function costForResult(result: ProviderResult): number {
  const price = PRICE_PER_MILLION[result.model];
  if (!price || !result.usage) return 0;
  const inTok = result.usage.inputTokens ?? 0;
  const outTok = result.usage.outputTokens ?? 0;
  return (inTok / 1_000_000) * price.input + (outTok / 1_000_000) * price.output;
}

/** Total USD cost across many results (e.g. every candidate in every round). */
export function totalCostUsd(results: ProviderResult[]): number {
  return results.reduce((sum, r) => sum + costForResult(r), 0);
}
