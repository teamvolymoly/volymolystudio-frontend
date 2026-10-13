import { randomUUID } from "node:crypto";
import { filterAuthCookies, rewriteAuthCookie } from "./auth-cookies.js";
import { laravelApiOrigin } from "./laravel-origin.js";

const MAX_BODY_BYTES = 8_192;

function resolveUpstream(path, method) {
  const endpoint = path.join("/");
  if (/^stores\/\d+\/orders\/\d+$/.test(endpoint) && method === "PATCH") {
    return `/api/v1/merchant/${endpoint}`;
  }

  return null;
}

function unavailableResponse(requestId) {
  return Response.json(
    { message: "Order service is unavailable. Please try again." },
    {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Request-ID": requestId,
      },
    },
  );
}

export async function proxyMerchantOrderRequest(request, { params }) {
  const { path } = await params;
  const upstreamPath = resolveUpstream(path, request.method);
  if (!upstreamPath) return Response.json({ message: "Not found." }, { status: 404 });

  const requestId = randomUUID();
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json({ message: "Request is too large." }, { status: 413 });
  }

  let upstream;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      return Response.json({ message: "Request is too large." }, { status: 413 });
    }

    const headers = new Headers({ Accept: "application/json" });
    headers.set("x-request-id", requestId);
    for (const name of ["content-type", "x-csrf-token", "user-agent"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, name === "user-agent" ? value.slice(0, 512) : value);
    }
    const cookies = filterAuthCookies(request.headers.get("cookie") || "");
    if (cookies) headers.set("cookie", cookies);

    upstream = await fetch(new URL(upstreamPath, laravelApiOrigin()), {
      method: "PATCH",
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("Merchant order proxy failure", {
      requestId,
      upstreamPath,
      error: error instanceof Error ? error.message : undefined,
    });
    return unavailableResponse(requestId);
  }

  if (upstream.status >= 500) {
    await upstream.body?.cancel();
    console.error("Merchant order upstream failure", {
      requestId,
      upstreamPath,
      status: upstream.status,
    });
    return unavailableResponse(requestId);
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Request-ID": requestId,
  });
  for (const name of ["content-type", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("Set-Cookie", rewriteAuthCookie(cookie));
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
