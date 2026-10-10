import { upsert } from "@/lib/demo-relay-server";

// POST /api/demo/estimates  { token, job, biz } — Carlos's app publishes a sent estimate
export async function POST(req: Request) {
  const { token, job, biz } = await req.json();
  if (typeof token !== "string" || !job) return Response.json({ error: "token and job required" }, { status: 400 });
  return Response.json(upsert(token, job, biz ?? {}));
}
