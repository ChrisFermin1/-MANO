import { getEntry } from "@/lib/demo-relay-server";

// GET /api/demo/estimates/:token — the customer's phone loads the estimate; Carlos's app checks for approval
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const entry = getEntry((await params).token);
  return entry ? Response.json(entry) : Response.json({ error: "not found" }, { status: 404 });
}
