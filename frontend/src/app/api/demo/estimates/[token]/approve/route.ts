import { approve } from "@/lib/demo-relay-server";

// POST /api/demo/estimates/:token/approve  { name } — the customer approves from their phone
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { name } = await req.json();
  if (typeof name !== "string" || name.trim().length < 2) return Response.json({ error: "name required" }, { status: 400 });
  const entry = approve((await params).token, name);
  return entry ? Response.json(entry) : Response.json({ error: "not found" }, { status: 404 });
}
