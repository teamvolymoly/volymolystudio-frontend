import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, test } from "node:test";
import { loginClientHeaders } from "../lib/server/login-client-context.js";
import { GET, POST } from "../app/api/auth/[...path]/route.js";

const originalFetch = globalThis.fetch;
const originalSecret = process.env.AUTH_PROXY_SECRET;
const originalVercel = process.env.VERCEL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.AUTH_PROXY_SECRET; else process.env.AUTH_PROXY_SECRET = originalSecret;
  if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
});

test("only trusted Vercel context is signed, with no client-supplied signature reuse", () => {
  process.env.VERCEL = "1";
  process.env.AUTH_PROXY_SECRET = "test-proxy-key-012345678901234567890";
  const request = new Request("https://frontend.example/api/auth/login/verify", { method: "POST", headers: {
    "user-agent": "Chrome/152.0", "x-vercel-forwarded-for": "203.0.113.10", "x-vercel-ip-country": "IN",
    "x-forwarded-for": "198.51.100.8", "x-auth-client-signature": "forged",
  }});
  const headers = loginClientHeaders(request, "login/verify");
  const context = JSON.parse(Buffer.from(headers["x-auth-client-context"], "base64").toString());
  assert.equal(context.ip, "203.0.113.10");
  assert.equal(context.location, "India");
  const expected = createHmac("sha256", process.env.AUTH_PROXY_SECRET)
    .update("POST\n/api/auth/login/verify\n" + headers["x-auth-client-context"]).digest("hex");
  assert.equal(headers["x-auth-client-signature"], expected);
});

test("local or unsupported hosting never trusts incoming location or forwarded IP headers", () => {
  delete process.env.VERCEL;
  const headers = loginClientHeaders(new Request("http://localhost:3000/api/auth/me", { headers: {
    "x-vercel-forwarded-for": "203.0.113.10", "x-vercel-ip-country": "IN", "x-forwarded-for": "203.0.113.10",
  }}), "me");
  const context = JSON.parse(Buffer.from(headers["x-auth-client-context"], "base64").toString());
  assert.equal(context.ip, null);
  assert.equal(context.location, null);
});

test("device cookie reaches successful login and remains HttpOnly on the frontend origin", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get("cookie"), "laravel_session=session; volymoly_device=encrypted");
    assert.equal(options.headers.get("user-agent"), "Chrome/152.0");
    return Response.json({ user: { id: 1 } }, { headers: {
      "Set-Cookie": "volymoly_device=rotated; Domain=backend.example; Path=/; HttpOnly; Secure; SameSite=Lax",
    }});
  };
  const response = await POST(new Request("https://frontend.example/api/auth/login/verify", {
    method: "POST", body: '{"code":"012345"}',
    headers: { Cookie: "laravel_session=session; volymoly_device=encrypted; private=omit", "User-Agent": "Chrome/152.0" },
  }), { params: Promise.resolve({ path: ["login", "verify"] }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.doesNotMatch(response.headers.get("set-cookie"), /Domain=/);
});

test("activity review forwards only the opaque token and uses a read-only GET", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, "/api/auth/security/activity");
    assert.equal(url.searchParams.has("token"), false);
    assert.equal(url.searchParams.has("user_id"), false);
    assert.equal(options.headers.get("x-activity-token"), "opaque-token");
    return Response.json({ activity: { device: "Chrome" } });
  };
  const url = "https://frontend.example/api/auth/security/activity?token=opaque-token&user_id=99";
  const context = { params: Promise.resolve({ path: ["security", "activity"] }) };
  const response = await GET(new Request(url), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal((await POST(new Request(url, { method: "POST" }), context)).status, 404);
});
