import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET, POST } from "../app/api/auth/[...path]/route.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("CSRF session cookies stay on the frontend origin", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, "https://volymoly.com/api/auth/csrf-token");
    assert.equal(options.headers.get("cookie"), "laravel_session=old; XSRF-TOKEN=csrf");
    assert.equal(options.headers.get("accept"), "application/json");

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append(
      "Set-Cookie",
      "laravel_session=new; Domain=volymoly.com; Path=/; Secure; HttpOnly; SameSite=None",
    );
    headers.append(
      "Set-Cookie",
      "XSRF-TOKEN=csrf2; Domain=volymoly.com; Path=/; Secure; SameSite=None",
    );
    return new Response(JSON.stringify({ token: "csrf-token" }), { headers });
  };

  const request = new Request("https://volymolystudio-frontend.vercel.app/api/auth/csrf-token", {
    headers: { Cookie: "laravel_session=old; other=private; XSRF-TOKEN=csrf" },
  });
  const response = await GET(request, { params: Promise.resolve({ path: ["csrf-token"] }) });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token: "csrf-token" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.doesNotMatch(cookie, /Domain=/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.doesNotMatch(cookie, /SameSite=None/i);
  }
});

test("login forwards the session and matching CSRF token", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, "https://volymoly.com/api/auth/login");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("cookie"), "laravel_session=active");
    assert.equal(options.headers.get("x-csrf-token"), "current-token");
    assert.equal(options.body, '{"email":"invalid"}');
    return Response.json({ message: "Validation failed." }, { status: 422 });
  };

  const request = new Request("https://volymolystudio-frontend.vercel.app/api/auth/login", {
    method: "POST",
    headers: {
      Cookie: "laravel_session=active; unrelated=secret",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": "current-token",
    },
    body: '{"email":"invalid"}',
  });
  const response = await POST(request, { params: Promise.resolve({ path: ["login"] }) });

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { message: "Validation failed." });
});

test("unlisted auth paths and methods cannot reach Laravel", async () => {
  globalThis.fetch = () => {
    throw new Error("Should not call upstream");
  };

  const request = new Request("https://volymolystudio-frontend.vercel.app/api/auth/admin");
  const response = await GET(request, { params: Promise.resolve({ path: ["admin"] }) });
  assert.equal(response.status, 404);
});

test("upstream network failure returns a safe error", async () => {
  globalThis.fetch = async () => {
    throw new Error("private network detail");
  };

  const request = new Request("https://volymolystudio-frontend.vercel.app/api/auth/me");
  const response = await GET(request, { params: Promise.resolve({ path: ["me"] }) });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private network detail/);
});
