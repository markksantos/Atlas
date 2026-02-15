import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";

export async function saveZip(files: { path: string; content: string }[]): Promise<{ id: string; filePath: string }> {
  const id = Math.random().toString(36).slice(2, 10);
  const dir = join(process.cwd(), ".data", "zips");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${id}.zip`);

  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    out.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(out);
    for (const f of files) archive.append(f.content, { name: f.path });
    archive.finalize();
  });

  return { id, filePath };
}



