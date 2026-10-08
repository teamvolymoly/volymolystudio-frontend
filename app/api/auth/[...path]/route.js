import { proxyAuthRequest } from "../../../../lib/server/auth-proxy.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  return proxyAuthRequest(request, context);
}

export async function POST(request, context) {
  return proxyAuthRequest(request, context);
}
