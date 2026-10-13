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

async function fetchLaravel(path) {
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
    response = await fetch(new URL(path, laravelApiOrigin()), {
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
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchCurrentUser() {
  const payload = await fetchLaravel("/api/auth/me");
  return toCurrentUser(payload?.user);
}

export async function fetchMerchantStores() {
  const payload = await fetchLaravel("/api/v1/merchant/stores");
  if (!payload || !Array.isArray(payload.stores)) return null;

  return payload.stores.filter((store) => (
    store
    && ["number", "string"].includes(typeof store.id)
    && typeof store.name === "string"
    && typeof store.status === "string"
  ));
}

export async function fetchMerchantOrders(storeId, filters = {}) {
  if (!["number", "string"].includes(typeof storeId) || !/^\d+$/.test(String(storeId))) {
    return null;
  }

  const params = new URLSearchParams();
  if (Number.isInteger(filters.page) && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  if (typeof filters.status === "string" && filters.status) {
    params.set("status", filters.status);
  }
  if (typeof filters.query === "string" && filters.query) {
    params.set("query", filters.query);
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const payload = await fetchLaravel(
    `/api/v1/merchant/stores/${encodeURIComponent(String(storeId))}/orders${suffix}`,
  );
  if (!payload || !Array.isArray(payload.orders) || !payload.pagination || !payload.summary) {
    return null;
  }

  return {
    filters: payload.filters || {},
    orders: payload.orders,
    pagination: payload.pagination,
    store: payload.store || null,
    summary: payload.summary,
  };
}

export async function fetchMerchantOrder(storeId, orderId) {
  if (
    !["number", "string"].includes(typeof storeId)
    || !/^\d+$/.test(String(storeId))
    || !["number", "string"].includes(typeof orderId)
    || !/^\d+$/.test(String(orderId))
  ) {
    return null;
  }

  const payload = await fetchLaravel(
    `/api/v1/merchant/stores/${encodeURIComponent(String(storeId))}/orders/${encodeURIComponent(String(orderId))}`,
  );

  return payload?.order && ["number", "string"].includes(typeof payload.order.id)
    ? payload.order
    : null;
}
