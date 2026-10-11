import { lanOrigin } from "@/lib/demo-relay-server";

// GET /api/demo/origin — this Mac's Wi-Fi address, so share links/QR codes open on a phone
export async function GET(req: Request) {
  const port = new URL(req.url).port || "80";
  return Response.json({ origin: lanOrigin(port) });
}
