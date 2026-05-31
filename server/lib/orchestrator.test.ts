import { describe, it, expect } from "vitest";
import { rankByHeuristics, repetitionRate } from "./orchestrator.js";
import type { ProviderResult } from "./providers.js";

function r(model: string, text: string): ProviderResult {
  return { model, text };
}

describe("repetitionRate", () => {
  it("is low for varied text", () => {
    expect(repetitionRate("the quick brown fox jumps over a lazy dog")).toBeLessThan(0.1);
  });

  it("rises when one token dominates", () => {
    expect(repetitionRate("spam spam spam spam spam spam")).toBeGreaterThan(0.8);
  });

  it("is 0 for empty text", () => {
    expect(repetitionRate("")).toBe(0);
  });
});

describe("rankByHeuristics", () => {
  it("ranks an on-topic answer above an off-topic one", () => {
    const prompt = "explain how photosynthesis converts sunlight into energy";
    const onTopic = r("a", "Photosynthesis converts sunlight into chemical energy stored in glucose, using chlorophyll.");
    const offTopic = r("b", "The stock market closed higher today on tech earnings.");
    const ranked = rankByHeuristics(prompt, [offTopic, onTopic]);
    expect(ranked[0]!.model).toBe("a");
  });

  it("penalizes highly repetitive answers", () => {
    const prompt = "give me a sentence about cats";
    const good = r("good", "Cats are independent animals that enjoy napping in warm spots.");
    const repetitive = r("rep", "cats cats cats cats cats cats cats cats cats cats");
    const ranked = rankByHeuristics(prompt, [repetitive, good]);
    expect(ranked[0]!.model).toBe("good");
  });

  it("returns an empty array unchanged", () => {
    expect(rankByHeuristics("anything", [])).toEqual([]);
  });
});
