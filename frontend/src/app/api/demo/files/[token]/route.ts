import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// DEMO-ONLY: the client-visible photos/files of a sent estimate or invoice, so a phone on the Wi-Fi can see
// them (same idea as /api/demo/estimates). One JSON file per link in the temp folder. Real version: the
// backend serves them from file storage (GET /public/estimates/:token/files).
const dir = path.join(os.tmpdir(), "mano-demo-files");
const fileFor = (token: string) => path.join(dir, `${token.replace(/[^\w-]/g, "")}.json`);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    return Response.json(JSON.parse(fs.readFileSync(fileFor(token), "utf8")));
  } catch {
    return Response.json({ files: [] });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { files } = await req.json();
  if (!Array.isArray(files)) return Response.json({ error: "files required" }, { status: 400 });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fileFor(token), JSON.stringify({ files }));
  return Response.json({ ok: true, count: files.length });
}
