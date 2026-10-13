import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { PATCH } from "../app/api/merchant/[...path]/route.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("merchant order proxy forwards only the scoped PATCH with session and CSRF", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, "https://volymoly.com/api/v1/merchant/stores/12/orders/44");
    assert.equal(options.method, "PATCH");
    assert.equal(options.headers.get("cookie"), "laravel_session=merchant; XSRF-TOKEN=csrf");
    assert.equal(options.headers.get("x-csrf-token"), "fresh-token");
    assert.equal(options.body, '{"status":"confirmed"}');
    return Response.json({ order: { id: 44, status: "confirmed" } });
  };

  const response = await PATCH(new Request("https://studio.example/api/merchant/stores/12/orders/44", {
    method: "PATCH",
    headers: {
      Cookie: "laravel_session=merchant; XSRF-TOKEN=csrf; private=omit",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": "fresh-token",
    },
    body: '{"status":"confirmed"}',
  }), { params: Promise.resolve({ path: ["stores", "12", "orders", "44"] }) });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.status, "confirmed");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("merchant order proxy rejects unlisted paths before contacting Laravel", async () => {
  globalThis.fetch = () => {
    throw new Error("Upstream must not be contacted");
  };

  const response = await PATCH(new Request("https://studio.example/api/merchant/stores/12/orders", {
    method: "PATCH",
    body: "{}",
  }), { params: Promise.resolve({ path: ["stores", "12", "orders"] }) });

  assert.equal(response.status, 404);
});

test("merchant order proxy hides Laravel server errors", async () => {
  globalThis.fetch = async () => Response.json(
    { message: "private database error and stack trace" },
    { status: 500 },
  );

  const response = await PATCH(new Request("https://studio.example/api/merchant/stores/12/orders/44", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }), { params: Promise.resolve({ path: ["stores", "12", "orders", "44"] }) });

  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /database|stack trace/i);
});
