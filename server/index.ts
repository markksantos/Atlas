import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { createDatabase } from "./lib/db.js";
import { orchestrateChat } from "./lib/orchestrator.js";
import { generateProjectFiles, planProjectFiles } from "./lib/codegen.js";
import { saveZip } from "./lib/attachments.js";
import { saveKeys, getKeys, clearKeys } from "./lib/keys.js";
import { createRoutes } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const db = createDatabase();

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", createRoutes(db));

// Helpful redirect for dev: visiting the API root will open the UI
app.get("/", (_req, res) => {
  res.redirect(302, "http://localhost:5173/");
});

// Keys
app.get("/api/keys", (_req, res) => {
  const keys = getKeys(db);
  res.json({ keys: Object.fromEntries(keys) });
});

app.post("/api/keys", (req, res) => {
  const Body = z.object({ keys: z.record(z.string()).default({}) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  saveKeys(db, new Map(Object.entries(parsed.data.keys)));
  res.json({ ok: true });
});

app.delete("/api/keys", (_req, res) => {
  clearKeys(db);
  res.json({ ok: true });
});

// Chat orchestration
app.post("/api/chat", async (req, res) => {
  const Body = z.object({
    messages: z.array(z.object({ who: z.enum(["user", "assistant"]).default("user"), text: z.string() })),
    selectedModels: z.array(z.string()),
    params: z.object({
      temperature: z.number().default(0.6),
      maxTokens: z.number().default(800),
      timeoutSec: z.number().default(60),
      tools: z.boolean().default(true),
      safety: z.boolean().default(true),
      showWork: z.boolean().default(false),
      rounds: z.number().min(1).max(8).default(4),
      minDurationSec: z.number().min(0).max(600).default(120),
      debate: z.boolean().default(true),
      costCapUsd: z.number().min(0).max(20).default(1.0)
    })
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const userText = parsed.data.messages[parsed.data.messages.length - 1]?.text || "";
    // Detect build/codegen intent
    const codegenIntent = /\b(generate|build|create|scaffold|output)\b[\s\S]*\b(app|project|code|files)\b/i.test(userText);
    if (codegenIntent) {
      send("status", { stage: "planning" });
      const plan = await planProjectFiles(db, userText, parsed.data.selectedModels);
      send("partial", { model: "manager", text: `Planned ${plan.length} files.` });
      const generated = await generateProjectFiles(db, { spec: userText, files: plan, selectedModels: parsed.data.selectedModels, params: { rounds: 3, temperature: parsed.data.params.temperature, maxTokens: parsed.data.params.maxTokens, timeoutSec: parsed.data.params.timeoutSec } });
      const zipMeta = await saveZip(generated);
      send("final", { text: `Generated ${generated.length} files. Download: /api/zip/${zipMeta.id}`, files: generated.map(f=>f.path) });
      send("done", { ok: true });
      return res.end();
    }

    await orchestrateChat({ db, body: parsed.data, onEvent: send });
    send("done", { ok: true });
    res.end();
  } catch (err) {
    console.error(err);
    send("error", { message: (err as Error).message ?? "unknown" });
    res.end();
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));


