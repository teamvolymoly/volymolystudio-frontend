import { loginClientHeaders } from "../../../lib/login-client-context.js";

// The deployed frontend and Laravel API have different top-level domains.
// Proxy only the auth endpoints so Laravel's session cookie belongs to the
// frontend origin in the browser, while Laravel still owns all auth logic.
function apiOrigin() {
  const configured = process.env.API_UPSTREAM_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://volymoly.com");
  const url = new URL(configured);
  const loopback = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "[::1]" || /^127\./.test(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || loopback))) {
    throw new Error("Invalid API upstream configuration");
  }
  return url.origin;
}
const SESSION_COOKIE_NAME = process.env.LARAVEL_SESSION_COOKIE || "laravel_session";

const METHODS = new Map([
  ["csrf-token", "GET"],
  ["google/redirect", "GET"],
  ["google/callback", "GET"],
  ["google/link-context", "GET"],
  ["google/link", "POST"],
  ["login", "POST"],
  ["login/verify", "POST"],
  ["login/resend", "POST"],
  ["me", "GET"],
  ["security/activity", "GET"],
  ["logout", "POST"],
  ["verification/send", "POST"],
  ["verification/verify", "POST"],
  ["password/forgot", "POST"],
  ["password/reset", "POST"],
  ["account/recover", "POST"],
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sessionCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const name = cookie.split("=", 1)[0];
      return name === SESSION_COOKIE_NAME || name === "XSRF-TOKEN" || name === "volymoly_device";
    })
    .join("; ");
}

async function proxy(request, { params }) {
  const { path } = await params;
  const endpoint = path.join("/");

  if (METHODS.get(endpoint) !== request.method) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }

  const headers = new Headers({ Accept: "application/json", ...loginClientHeaders(request, endpoint) });
  for (const name of ["content-type", "x-csrf-token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const cookies = sessionCookies(request.headers.get("cookie") || "");
  if (cookies) headers.set("cookie", cookies);

  let upstream;
  try {
    const url = new URL(`/api/auth/${endpoint}`, apiOrigin());
    if (endpoint === "security/activity") {
      const token = new URL(request.url).searchParams.get("token");
      if (token) url.searchParams.set("token", token);
    }
    if (endpoint === "google/callback") {
      // Forward OAuth response fields, never arbitrary upstream URLs.
      const incoming = new URL(request.url).searchParams;
      for (const name of ["code", "state", "error", "error_description", "scope", "authuser", "prompt"]) {
        if (incoming.has(name)) url.searchParams.set(name, incoming.get(name));
      }
    }
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return Response.json(
      { message: "Authentication service is unavailable. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (upstream.status >= 500) {
    await upstream.body?.cancel();
    return Response.json(
      { message: "Authentication service is unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  if (endpoint === "google/redirect" || endpoint === "google/callback") {
    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      responseHeaders.set("Location", location);
    }
  }
  for (const name of ["content-type", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  for (const cookie of upstream.headers.getSetCookie()) {
    // A cookie from volymoly.com must not retain its Domain attribute when
    // delivered by the Vercel origin, or the browser will reject it. The
    // browser now talks to one site, so Lax is sufficient and safer than
    // keeping an upstream cross-site SameSite=None setting.
    responseHeaders.append(
      "Set-Cookie",
      cookie
        .replace(/;\s*Domain=[^;]*/gi, "")
        .replace(/;\s*SameSite=[^;]*/gi, "") + "; SameSite=Lax",
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request, context) {
  return proxy(request, context);
}

export async function POST(request, context) {
  return proxy(request, context);
}
