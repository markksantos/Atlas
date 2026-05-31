import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DB } from "./db.js";
import { getKey } from "./keys.js";

export type ProviderResult = {
  model: string;
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  costUsd?: number;
};

export type ProviderCall = (args: {
  db: DB;
  modelId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}) => Promise<ProviderResult>;

/**
 * Maps the catalog model id (`provider:model`) to the exact id each provider's
 * API expects. The UI catalog can stay stable/marketing-friendly while we send
 * the canonical API ids here.
 */
const MODEL_ID_MAP: Record<string, string> = {
  // OpenAI — sent verbatim to the OpenAI API (these are real ids)
  "openai:gpt-5": "gpt-5",
  "openai:gpt-5-mini": "gpt-5-mini",
  "openai:gpt-5-nano": "gpt-5-nano",
  "openai:gpt-4.1": "gpt-4.1",
  "openai:gpt-4.1-mini": "gpt-4.1-mini",
  "openai:gpt-4.1-nano": "gpt-4.1-nano",
  "openai:gpt-4o": "gpt-4o",
  "openai:gpt-4o-2024-05-13": "gpt-4o-2024-05-13",
  "openai:gpt-4o-mini": "gpt-4o-mini",
  "openai:o1": "o1",
  "openai:o1-pro": "o1-pro",
  "openai:o3-pro": "o3-pro",
  "openai:o3": "o3",
  "openai:o3-deep-research": "o3-deep-research",
  "openai:o4-mini": "o4-mini",
  "openai:o4-mini-deep-research": "o4-mini-deep-research",
  "openai:o3-mini": "o3-mini",
  "openai:o1-mini": "o1-mini",

  // Anthropic — catalog uses friendly ids; API needs dated/`-latest` ids
  "anthropic:claude-3-opus": "claude-3-opus-latest",
  "anthropic:claude-3.5-sonnet": "claude-3-5-sonnet-latest",

  // Google
  "google:gemini-2.5-pro": "gemini-2.5-pro",
  "google:gemini-2.5-flash": "gemini-2.5-flash",

  // xAI
  "xai:grok-4": "grok-4",
  "xai:grok-3": "grok-3",
  "xai:grok-heavy": "grok-4-heavy",

  // DeepSeek
  "deepseek:r1": "deepseek-reasoner",

  // OpenAI-compatible third parties
  "z:latest": "glm-4.6",
  "kimi:k2": "kimi-k2-0905-preview",
  "qwen:latest": "qwen-max"
};

function apiModelId(modelId: string): string {
  return MODEL_ID_MAP[modelId] ?? modelId.split(":")[1] ?? modelId;
}

export const providerForModel: Record<string, ProviderCall> = {
  // OpenAI family
  "openai:gpt-5": callOpenAI,
  "openai:gpt-5-mini": callOpenAI,
  "openai:gpt-5-nano": callOpenAI,
  "openai:gpt-4.1": callOpenAI,
  "openai:gpt-4.1-mini": callOpenAI,
  "openai:gpt-4.1-nano": callOpenAI,
  "openai:gpt-4o": callOpenAI,
  "openai:gpt-4o-2024-05-13": callOpenAI,
  "openai:gpt-4o-mini": callOpenAI,
  "openai:o1": callOpenAI,
  "openai:o1-pro": callOpenAI,
  "openai:o3-pro": callOpenAI,
  "openai:o3": callOpenAI,
  "openai:o3-deep-research": callOpenAI,
  "openai:o4-mini": callOpenAI,
  "openai:o4-mini-deep-research": callOpenAI,
  "openai:o3-mini": callOpenAI,
  "openai:o1-mini": callOpenAI,

  // Anthropic
  "anthropic:claude-3-opus": callAnthropic,
  "anthropic:claude-3.5-sonnet": callAnthropic,

  // Google
  "google:gemini-2.5-pro": callGoogle,
  "google:gemini-2.5-flash": callGoogle,

  // xAI
  "xai:grok-4": callXAI,
  "xai:grok-3": callXAI,
  "xai:grok-heavy": callXAI,

  // DeepSeek
  "deepseek:r1": callDeepSeek,

  // OpenAI-compatible third parties
  "z:latest": callZ,
  "kimi:k2": callKimi,
  "qwen:latest": callQwen
};

/** Reasoning models (o-series) don't accept a custom `temperature`. */
function isReasoningModel(apiId: string): boolean {
  return /^o[0-9]/.test(apiId);
}

async function callOpenAI({ db, modelId, messages, temperature, maxTokens, timeoutMs }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "OPENAI_API_KEY") || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const client = new OpenAI({ apiKey, timeout: timeoutMs });
  const model = apiModelId(modelId);
  const reasoning = isReasoningModel(model);

  // Prefer the Responses API for modern models; fall back to Chat Completions.
  try {
    const params: Record<string, unknown> = {
      model,
      input: messages.map(m => ({ role: m.role, content: [{ type: "input_text", text: m.content }] })),
      max_output_tokens: maxTokens
    };
    if (!reasoning) params.temperature = temperature;
    const resp = await client.responses.create(params as never);
    const r = resp as unknown as Record<string, unknown> & { output_text?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = (r.output_text ?? extractResponsesText(r) ?? "").toString();
    return {
      model: modelId,
      text,
      usage: r.usage ? { inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens } : undefined
    };
  } catch (err) {
    // Fallback to Chat Completions for older/compatible models.
    const params: Record<string, unknown> = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    };
    if (reasoning) params.max_completion_tokens = maxTokens;
    else { params.temperature = temperature; params.max_tokens = maxTokens; }
    const resp = await client.chat.completions.create(params as never);
    const choice = (resp.choices?.[0]?.message?.content ?? "").toString();
    const usage = resp.usage ? { inputTokens: resp.usage.prompt_tokens, outputTokens: resp.usage.completion_tokens } : undefined;
    if (!choice) throw err instanceof Error ? err : new Error(String(err));
    return { model: modelId, text: choice, usage };
  }
}

function extractResponsesText(resp: Record<string, unknown>): string {
  const output = resp.output as Array<{ content?: Array<{ text?: string }> }> | undefined;
  if (Array.isArray(output)) {
    return output
      .flatMap(o => (o.content ?? []).map(c => c.text ?? ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

async function callAnthropic({ db, modelId, messages, temperature, maxTokens, timeoutMs }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing Anthropic API key");
  const client = new Anthropic({ apiKey, timeout: timeoutMs });
  // Anthropic requires the first message to be from the user.
  const normalized = messages.filter(m => m.content.trim().length > 0);
  const first = normalized[0];
  const safeMessages = first && first.role === "assistant"
    ? [{ role: "user" as const, content: first.content }, ...normalized.slice(1)]
    : normalized;
  const resp = await client.messages.create({
    model: apiModelId(modelId),
    max_tokens: maxTokens,
    temperature,
    messages: safeMessages.map(m => ({ role: m.role, content: m.content }))
  });
  const text = resp.content
    .map(block => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return {
    model: modelId,
    text,
    usage: { inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens }
  };
}

async function callGoogle({ db, modelId, messages, temperature, maxTokens, timeoutMs }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "GOOGLE_API_KEY") || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing Google API key");
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: apiModelId(modelId) });
  const prompt = messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
  const resp = await Promise.race([
    model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } }),
    timeoutAfter(timeoutMs, "Google request timed out")
  ]);
  const text = resp.response.text();
  const usage = resp.response.usageMetadata
    ? { inputTokens: resp.response.usageMetadata.promptTokenCount, outputTokens: resp.response.usageMetadata.candidatesTokenCount }
    : undefined;
  return { model: modelId, text, usage };
}

/**
 * Shared caller for OpenAI-compatible chat-completions endpoints (xAI, DeepSeek,
 * Z.ai, Kimi/Moonshot, Qwen/DashScope). Uses the OpenAI SDK with a custom
 * baseURL so we get retries, timeouts and consistent parsing for free.
 */
async function callOpenAICompatible(args: {
  db: DB;
  modelId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  baseURL: string;
  envKey: string;
  label: string;
}): Promise<ProviderResult> {
  const { db, modelId, messages, temperature, maxTokens, timeoutMs, baseURL, envKey, label } = args;
  const apiKey = getKey(db, envKey) || process.env[envKey];
  if (!apiKey) throw new Error(`Missing ${label} API key`);
  const client = new OpenAI({ apiKey, baseURL, timeout: timeoutMs });
  const resp = await client.chat.completions.create({
    model: apiModelId(modelId),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens
  });
  const text = (resp.choices?.[0]?.message?.content ?? "").toString();
  const usage = resp.usage ? { inputTokens: resp.usage.prompt_tokens, outputTokens: resp.usage.completion_tokens } : undefined;
  return { model: modelId, text, usage };
}

function callXAI(args: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  return callOpenAICompatible({ ...args, baseURL: "https://api.x.ai/v1", envKey: "XAI_API_KEY", label: "xAI" });
}

function callDeepSeek(args: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  return callOpenAICompatible({ ...args, baseURL: "https://api.deepseek.com/v1", envKey: "DEEPSEEK_API_KEY", label: "DeepSeek" });
}

function callZ(args: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  return callOpenAICompatible({ ...args, baseURL: "https://api.z.ai/api/paas/v4", envKey: "Z_API_KEY", label: "Z.ai" });
}

function callKimi(args: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  return callOpenAICompatible({ ...args, baseURL: "https://api.moonshot.ai/v1", envKey: "KIMI_API_KEY", label: "Kimi" });
}

function callQwen(args: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  return callOpenAICompatible({ ...args, baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", envKey: "QWEN_API_KEY", label: "Qwen" });
}

function timeoutAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}
