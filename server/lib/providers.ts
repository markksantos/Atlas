import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
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

  // xAI (placeholder via REST if available)
  "xai:grok-4": callXAI,
  "xai:grok-3": callXAI,
  "xai:grok-heavy": callXAI,

  // DeepSeek
  "deepseek:r1": callDeepSeek,

  // Others placeholder
  "z:latest": callZ,
  "kimi:k2": callKimi,
  "qwen:latest": callQwen
};

async function callOpenAI({ db, modelId, messages, temperature, maxTokens, timeoutMs }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "OPENAI_API_KEY") || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const client = new OpenAI({ apiKey });
  const requested = modelId.split(":")[1]!;
  const shortModel = resolveOpenAIModel(requested);
  // Prefer Responses API for modern models; fall back to Chat Completions
  try {
    const resp: any = await client.responses.create({
      model: shortModel,
      input: messages.map(m => ({ role: m.role, content: [{ type: "text", text: m.content }] })),
      temperature,
      max_output_tokens: maxTokens
    } as any, { timeout: timeoutMs } as any);
    const text = (resp.output_text
      || resp.output?.[0]?.content?.map((c: any) => c.text).join("\n")
      || resp.content?.map((c: any) => (c.text ?? c)).join("\n")
      || "").toString();
    return { model: modelId, text };
  } catch (err) {
    // Fallback to Chat Completions for backward compatibility
    const resp = await client.chat.completions.create({
      model: shortModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: maxTokens
    } as any, { timeout: timeoutMs } as any);
    const choice = (resp.choices?.[0]?.message?.content ?? "").toString();
    const usage = resp.usage ? { inputTokens: (resp.usage as any).prompt_tokens ?? undefined, outputTokens: (resp.usage as any).completion_tokens ?? undefined } : undefined;
    return { model: modelId, text: choice, usage };
  }
}

function resolveOpenAIModel(requested: string): string {
  const supported = new Set([
    "gpt-4o", "gpt-4o-mini",
    "gpt-4.1", "gpt-4.1-mini",
    // compatibility fallbacks
    "gpt-3.5-turbo"
  ]);
  if (supported.has(requested)) return requested;
  // map experimental/unknown to closest stable default
  if (requested.startsWith("o1") || requested.startsWith("o3") || requested.startsWith("o4")) return "gpt-4o";
  if (requested.includes("5")) return "gpt-4o";
  return "gpt-4o";
}

async function callAnthropic({ db, modelId, messages, temperature, maxTokens, timeoutMs }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing Anthropic API key");
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: modelId.split(":")[1]!,
    max_tokens: maxTokens,
    temperature,
    messages: messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    timeout_ms: timeoutMs
  } as any);
  const text = (resp.content?.[0] as any)?.text || "";
  return { model: modelId, text };
}

async function callGoogle({ db, modelId, messages, temperature, maxTokens }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "GOOGLE_API_KEY") || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing Google API key");
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: modelId.split(":")[1]! });
  const prompt = messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
  const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } });
  const text = resp.response.text();
  return { model: modelId, text };
}

async function callXAI({ db, modelId, messages }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "XAI_API_KEY") || process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Missing xAI API key");
  // Placeholder endpoint (xAI API may differ)
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");
  const { data } = await axios.post("https://api.x.ai/v1/chat/completions", { model: modelId.split(":")[1], messages: [{ role: "user", content: prompt }] }, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = data.choices?.[0]?.message?.content ?? "";
  return { model: modelId, text };
}

async function callDeepSeek({ db, modelId, messages, temperature, maxTokens }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "DEEPSEEK_API_KEY") || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DeepSeek API key");
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
  const { data } = await axios.post("https://api.deepseek.com/chat/completions", { model: modelId.split(":")[1], messages: [{ role: "user", content: prompt }], temperature, max_tokens: maxTokens }, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = data.choices?.[0]?.message?.content ?? "";
  return { model: modelId, text };
}

async function callZ({ db, modelId, messages }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "Z_API_KEY") || process.env.Z_API_KEY;
  if (!apiKey) throw new Error("Missing Z.ai API key");
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
  const { data } = await axios.post("https://api.z.ai/v1/chat", { model: modelId.split(":")[1], messages: [{ role: "user", content: prompt }] }, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = data.choices?.[0]?.message?.content ?? "";
  return { model: modelId, text };
}

async function callKimi({ db, modelId, messages }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "KIMI_API_KEY") || process.env.KIMI_API_KEY;
  if (!apiKey) throw new Error("Missing Kimi API key");
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
  const { data } = await axios.post("https://api.kimi.moonshot.cn/v1/chat/completions", { model: modelId.split(":")[1], messages: [{ role: "user", content: prompt }] }, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = data.choices?.[0]?.message?.content ?? "";
  return { model: modelId, text };
}

async function callQwen({ db, modelId, messages }: Parameters<ProviderCall>[0]): Promise<ProviderResult> {
  const apiKey = getKey(db, "QWEN_API_KEY") || process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error("Missing QWEN API key");
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
  const { data } = await axios.post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", { model: modelId.split(":")[1], messages: [{ role: "user", content: prompt }] }, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = data.choices?.[0]?.message?.content ?? "";
  return { model: modelId, text };
}


