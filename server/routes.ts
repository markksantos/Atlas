import { Router } from "express";
import { z } from "zod";
import type { DB } from "./lib/db.js";
import { listRuns, clearRuns, saveRun } from "./lib/db.js";
import archiver from "archiver";
import { generateProjectFiles, planProjectFiles } from "./lib/codegen.js";
import { z } from "zod";
import { createReadStream } from "node:fs";
import { join } from "node:path";

export function createRoutes(db: DB) {
  const r = Router();

  r.get("/runs", (req, res) => {
    const query = String(req.query.q ?? "").trim() || undefined;
    const limit = Number(req.query.limit ?? 25);
    const rows = listRuns(db, { query, limit });
    res.json({ runs: rows });
  });

  r.delete("/runs", (_req, res) => {
    clearRuns(db);
    res.json({ ok: true });
  });

  r.post("/runs", (req, res) => {
    const Body = z.object({ prompt: z.string(), models: z.array(z.string()), finalText: z.string(), candidates: z.any() });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const id = saveRun(db, parsed.data);
    res.json({ id });
  });

  // Codegen: manager orchestrates file-level generation; returns zip
  r.post("/codegen/zip", async (req, res) => {
    const Body = z.object({
      spec: z.string(),
      files: z.array(z.object({ path: z.string(), instruction: z.string() })),
      selectedModels: z.array(z.string()).optional(),
      params: z.object({ rounds: z.number().optional(), temperature: z.number().optional(), maxTokens: z.number().optional(), timeoutSec: z.number().optional() }).optional()
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=codegen.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("warning", (err) => console.warn("[zip] warning", err));
    archive.on("error", (err) => { console.error(err); res.status(500).end(); });
    archive.pipe(res);

    const files = await generateProjectFiles(db, parsed.data, (ev) => {
      // could stream server-sent events for progress later
    });
    for (const f of files) {
      archive.append(f.content, { name: f.path });
    }
    await archive.finalize();
  });

  // Codegen planner: returns JSON list of files
  r.post("/codegen/plan", async (req, res) => {
    const Body = z.object({ spec: z.string(), selectedModels: z.array(z.string()).optional() });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const plan = await planProjectFiles(db, parsed.data.spec, parsed.data.selectedModels);
    res.json({ files: plan });
  });

  // Serve generated zip by id
  r.get("/zip/:id", async (req, res) => {
    const id = String(req.params.id);
    const filePath = join(process.cwd(), ".data", "zips", `${id}.zip`);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${id}.zip`);
    createReadStream(filePath).pipe(res);
  });

  return r;
}


