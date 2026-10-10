import { randomUUID } from "node:crypto";
import { filterAuthCookies, rewriteAuthCookie } from "./auth-cookies.js";
import { loginClientHeaders } from "./login-client-context.js";
import { laravelApiOrigin } from "./laravel-origin.js";

// The deployed frontend and Laravel API have different top-level domains.
// Proxy only the auth endpoints so Laravel's session cookie belongs to the
// frontend origin in the browser, while Laravel still owns all auth logic.
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
  ["security/secure", "POST"],
  ["logout", "POST"],
  ["verification/send", "POST"],
  ["verification/verify", "POST"],
  ["password/forgot", "POST"],
  ["password/reset", "POST"],
  ["account/recover", "POST"],
]);

function unavailableResponse(status, requestId) {
  return Response.json(
    { message: "Authentication service is unavailable. Please try again." },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Request-ID": requestId,
      },
    },
  );
}

function logProxyFailure({ requestId, endpoint, method, status, error }) {
  console.error("Authentication proxy failure", {
    requestId,
    endpoint,
    method,
    status,
    error: error instanceof Error ? error.message : undefined,
  });
}

export async function proxyAuthRequest(request, { params }) {
  const { path } = await params;
  const endpoint = path.join("/");

  if (METHODS.get(endpoint) !== request.method) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }

  const requestId = randomUUID();
  let upstream;
  try {
    const headers = new Headers({ Accept: "application/json", ...loginClientHeaders(request, endpoint) });
    headers.set("x-request-id", requestId);
    for (const name of ["content-type", "x-csrf-token"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const cookies = filterAuthCookies(request.headers.get("cookie") || "");
    if (cookies) headers.set("cookie", cookies);

    const url = new URL(`/api/auth/${endpoint}`, laravelApiOrigin());
    if (endpoint === "security/activity") {
      const token = request.headers.get("x-activity-token")
        || new URL(request.url).searchParams.get("token");
      if (token) headers.set("x-activity-token", token);
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
  } catch (error) {
    logProxyFailure({ requestId, endpoint, method: request.method, status: 502, error });
    return unavailableResponse(502, requestId);
  }

  if (upstream.status >= 500) {
    await upstream.body?.cancel();
    logProxyFailure({ requestId, endpoint, method: request.method, status: upstream.status });
    return unavailableResponse(503, requestId);
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Request-ID": requestId,
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
      rewriteAuthCookie(cookie),
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
