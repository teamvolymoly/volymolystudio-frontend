import "server-only";

import { cookies, headers } from "next/headers";
import { filterAuthCookies, hasLaravelSessionCookie } from "./auth-cookies";
import { laravelApiOrigin } from "./laravel-origin";

const REQUEST_TIMEOUT_MS = 30_000;

function toCurrentUser(user) {
  if (
    !user
    || !["number", "string"].includes(typeof user.id)
    || typeof user.name !== "string"
    || typeof user.email !== "string"
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: typeof user.email_verified_at === "string"
      ? user.email_verified_at
      : null,
  };
}

async function discardResponse(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already closed; there is nothing left to expose.
  }
}

export async function fetchCurrentUser() {
  const cookieStore = await cookies();
  const authCookies = filterAuthCookies(cookieStore.toString());

  if (!hasLaravelSessionCookie(authCookies)) {
    return null;
  }

  const requestHeaders = await headers();
  const upstreamHeaders = new Headers({ Accept: "application/json" });
  upstreamHeaders.set("cookie", authCookies);

  const userAgent = requestHeaders.get("user-agent");
  if (userAgent) {
    upstreamHeaders.set("user-agent", userAgent.slice(0, 512));
  }

  let response;
  try {
    response = await fetch(new URL("/api/auth/me", laravelApiOrigin()), {
      method: "GET",
      headers: upstreamHeaders,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    await discardResponse(response);
    return null;
  }

  try {
    const payload = await response.json();
    return toCurrentUser(payload.user);
  } catch {
    return null;
  }
}
