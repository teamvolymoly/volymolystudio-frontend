import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Only platform-overwritten edge headers supply location/IP, never arbitrary XFF.
export function loginClientHeaders(request, endpoint) {
  const agent = (request.headers.get("user-agent") || "").slice(0, 512);
  let ip = null;
  let location = null;
  if (process.env.VERCEL === "1") {
    const edgeIp = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (edgeIp && isIP(edgeIp)) ip = edgeIp;
    const country = request.headers.get("x-vercel-ip-country");
    if (country && /^[A-Z]{2}$/.test(country)) {
      try {
        location = new Intl.DisplayNames(["en"], { type: "region" }).of(country);
      } catch { /* Missing geolocation is shown as unavailable. */ }
    }
  }
  const payload = Buffer.from(JSON.stringify({ agent, ip, location, timestamp: Math.floor(Date.now() / 1000) })).toString("base64");
  const headers = { "user-agent": agent, "x-auth-client-context": payload };
  const secret = process.env.AUTH_PROXY_SECRET || "";
  if (secret.length >= 32) {
    headers["x-auth-client-signature"] = createHmac("sha256", secret)
      .update(request.method + "\n/api/auth/" + endpoint + "\n" + payload).digest("hex");
  }
  return headers;
}
