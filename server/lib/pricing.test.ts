import { describe, it, expect } from "vitest";
import { costForResult, totalCostUsd } from "./pricing.js";
import type { ProviderResult } from "./providers.js";

function result(model: string, inputTokens?: number, outputTokens?: number): ProviderResult {
  return {
    model,
    text: "x",
    usage: inputTokens === undefined && outputTokens === undefined ? undefined : { inputTokens, outputTokens }
  };
}

describe("costForResult", () => {
  it("computes cost from list prices (gpt-4o-mini)", () => {
    // gpt-4o-mini: $0.075 / 1M input, $0.30 / 1M output.
    // 1,000,000 in + 1,000,000 out = 0.075 + 0.30 = $0.375
    const cost = costForResult(result("openai:gpt-4o-mini", 1_000_000, 1_000_000));
    expect(cost).toBeCloseTo(0.375, 6);
  });

  it("scales linearly with token count", () => {
    const small = costForResult(result("openai:gpt-4o", 100, 50));
    const big = costForResult(result("openai:gpt-4o", 1000, 500));
    expect(big).toBeCloseTo(small * 10, 9);
  });

  it("returns 0 for models with no published price", () => {
    expect(costForResult(result("anthropic:claude-3.5-sonnet", 1000, 1000))).toBe(0);
    expect(costForResult(result("google:gemini-2.5-pro", 1000, 1000))).toBe(0);
  });

  it("returns 0 when usage is missing", () => {
    expect(costForResult(result("openai:gpt-4o"))).toBe(0);
  });

  it("treats a missing input or output count as zero", () => {
    // gpt-4o: $1.25 / 1M input. 1M input, no output reported.
    expect(costForResult(result("openai:gpt-4o", 1_000_000))).toBeCloseTo(1.25, 6);
  });
});

describe("totalCostUsd", () => {
  it("sums across results, ignoring unpriced ones", () => {
    const total = totalCostUsd([
      result("openai:gpt-4o-mini", 1_000_000, 1_000_000), // 0.375
      result("anthropic:claude-3.5-sonnet", 1_000_000, 1_000_000), // 0 (unpriced)
      result("openai:gpt-4o-mini", 1_000_000, 1_000_000) // 0.375
    ]);
    expect(total).toBeCloseTo(0.75, 6);
  });

  it("is 0 for an empty set", () => {
    expect(totalCostUsd([])).toBe(0);
  });
});
