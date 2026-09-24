import { describe, it, expect, vi, beforeEach } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  }
}));
vi.mock("./keys.js", () => ({ getKey: () => "test-key" }));

import { providerForModel } from "./providers.js";

function call(modelId: string) {
  return providerForModel[modelId]!({
    db: {} as never,
    modelId,
    messages: [{ role: "user", content: "hi" }],
    temperature: 0.6,
    maxTokens: 800,
    timeoutMs: 1000
  });
}

describe("callAnthropic", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } });
  });

  it.each([
    ["anthropic:claude-fable-5-1", "claude-fable-5-1"],
    ["anthropic:claude-opus-5-5", "claude-opus-5-5"],
    ["anthropic:claude-sonnet-5", "claude-sonnet-5"]
  ])("sends %s as %s without temperature", async (catalogId, apiId) => {
    await call(catalogId);
    const params = create.mock.calls[0]![0];
    expect(params.model).toBe(apiId);
    expect(params).not.toHaveProperty("temperature");
  });

  it("sends Haiku 4.5 as its dated snapshot with temperature", async () => {
    await call("anthropic:claude-haiku-4-5");
    const params = create.mock.calls[0]![0];
    expect(params.model).toBe("claude-haiku-4-5-20251001");
    expect(params.temperature).toBe(0.6);
  });
});
