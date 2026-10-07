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

test("Google redirect preserves Location and the state session cookie", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, "https://volymoly.com/api/auth/google/redirect");
    assert.equal(options.redirect, "manual");
    const headers = new Headers({
      Location: "https://accounts.google.com/o/oauth2/auth?state=random-state",
      "Set-Cookie": "laravel_session=oauth; Domain=volymoly.com; Path=/; Secure; HttpOnly; SameSite=None",
    });
    return new Response(null, { status: 302, headers });
  };
  const response = await GET(
    new Request("https://volymolystudio-frontend.vercel.app/api/auth/google/redirect"),
    { params: Promise.resolve({ path: ["google", "redirect"] }) },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://accounts.google.com/o/oauth2/auth?state=random-state");
  assert.match(response.headers.get("set-cookie"), /laravel_session=oauth/);
  assert.doesNotMatch(response.headers.get("set-cookie"), /Domain=/i);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
});

test("Google callback forwards encoded code/state and rotates frontend session", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, "/api/auth/google/callback");
    assert.equal(url.searchParams.get("code"), "code+with/slash=");
    assert.equal(url.searchParams.get("state"), "state+with&symbols");
    assert.equal(url.searchParams.has("return_url"), false);
    assert.equal(options.headers.get("cookie"), "laravel_session=oauth");
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: {
        Location: "https://volymolystudio-frontend.vercel.app/dashboard",
        "Set-Cookie": "laravel_session=authenticated; Domain=volymoly.com; Path=/; Secure; HttpOnly; SameSite=None",
      },
    });
  };
  const query = new URLSearchParams({ code: "code+with/slash=", state: "state+with&symbols", return_url: "https://attacker.invalid" });
  const response = await GET(
    new Request("https://volymolystudio-frontend.vercel.app/api/auth/google/callback?" + query, {
      headers: { Cookie: "laravel_session=oauth; irrelevant=secret" },
    }),
    { params: Promise.resolve({ path: ["google", "callback"] }) },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://volymolystudio-frontend.vercel.app/dashboard");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("set-cookie"), /laravel_session=authenticated/);
  assert.doesNotMatch(response.headers.get("set-cookie"), /Domain=/i);
});

test("Google cancellation forwards provider error and state", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url.searchParams.get("error"), "access_denied");
    assert.equal(url.searchParams.get("state"), "cancel-state");
    return new Response(null, { status: 302, headers: { Location: "https://volymolystudio-frontend.vercel.app/?google_error=cancelled" } });
  };
  const response = await GET(
    new Request("https://volymolystudio-frontend.vercel.app/api/auth/google/callback?error=access_denied&state=cancel-state"),
    { params: Promise.resolve({ path: ["google", "callback"] }) },
  );
  assert.equal(response.status, 302);
  assert.match(response.headers.get("location"), /google_error=cancelled/);
});

test("Google linking is a CSRF-protected POST through Laravel", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, "/api/auth/google/link");
    assert.equal(options.headers.get("x-csrf-token"), "session-csrf");
    assert.equal(options.headers.get("cookie"), "laravel_session=pending-link");
    assert.equal(options.body, '{"password":"existing-password"}');
    return Response.json({ user: { id: 7 } });
  };
  const request = new Request("https://volymolystudio-frontend.vercel.app/api/auth/google/link", {
    method: "POST",
    headers: { Cookie: "laravel_session=pending-link", "X-CSRF-TOKEN": "session-csrf", "Content-Type": "application/json" },
    body: '{"password":"existing-password"}',
  });
  const response = await POST(request, { params: Promise.resolve({ path: ["google", "link"] }) });
  assert.equal(response.status, 200);
  const wrongMethod = await GET(new Request(request.url), { params: Promise.resolve({ path: ["google", "link"] }) });
  assert.equal(wrongMethod.status, 404);
});

test("local development targets the local Laravel API", async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousUpstream = process.env.API_UPSTREAM_URL;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.API_UPSTREAM_URL;
    const localProxy = await import("../app/api/auth/[...path]/route.js?local-oauth");
    globalThis.fetch = async (url) => {
      assert.equal(url.origin, "http://localhost:8000");
      assert.equal(url.pathname, "/api/auth/google/callback");
      assert.equal(url.searchParams.get("state"), "local-state");
      return new Response(null, { status: 302, headers: { Location: "http://localhost:3000/dashboard" } });
    };
    const response = await localProxy.GET(
      new Request("http://localhost:3000/api/auth/google/callback?code=local-code&state=local-state"),
      { params: Promise.resolve({ path: ["google", "callback"] }) },
    );
    assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard");
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousUpstream === undefined) delete process.env.API_UPSTREAM_URL;
    else process.env.API_UPSTREAM_URL = previousUpstream;
  }
});


test("login OTP verify/resend preserve pending session, CSRF and rotated cookies", async () => {
  for (const endpoint of ["verify", "resend"]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url.pathname, "/api/auth/login/" + endpoint);
      assert.equal(options.headers.get("cookie"), "laravel_session=pending");
      assert.equal(options.headers.get("x-csrf-token"), "pending-csrf");
      assert.equal(options.body, endpoint === "verify" ? '{"code":"012345"}' : "{}");
      return Response.json(endpoint === "verify" ? { user: { id: 7 } } : { message: "Sent" }, {
        status: endpoint === "verify" ? 200 : 202,
        headers: { "Set-Cookie": "laravel_session=rotated; Domain=volymoly.com; Path=/; HttpOnly; Secure" },
      });
    };
    const request = new Request("https://frontend.example/api/auth/login/" + endpoint, {
      method: "POST",
      headers: { Cookie: "laravel_session=pending; unrelated=private", "X-CSRF-TOKEN": "pending-csrf" },
      body: endpoint === "verify" ? '{"code":"012345"}' : "{}",
    });
    const context = { params: Promise.resolve({ path: ["login", endpoint] }) };
    const response = await POST(request, context);
    assert.equal(response.status, endpoint === "verify" ? 200 : 202);
    assert.match(response.headers.get("set-cookie"), /laravel_session=rotated/);
    assert.doesNotMatch(response.headers.get("set-cookie"), /Domain=/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await GET(new Request(request.url), context)).status, 404);
  }
});


test("reset-link requests forward CSRF/session and return Laravel cooldown", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, "/api/auth/password/forgot");
    assert.equal(options.headers.get("cookie"), "laravel_session=reset-session");
    assert.equal(options.headers.get("x-csrf-token"), "reset-csrf");
    assert.equal(options.body, '{"email":"user@example.test"}');
    return Response.json({ message: "Please wait", retry_after: 40 }, { status: 429, headers: { "Retry-After": "40" } });
  };
  const response = await POST(new Request("https://frontend.example/api/auth/password/forgot", {
    method: "POST",
    headers: { Cookie: "laravel_session=reset-session", "X-CSRF-TOKEN": "reset-csrf" },
    body: '{"email":"user@example.test"}',
  }), { params: Promise.resolve({ path: ["password", "forgot"] }) });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "40");
});

test("backend mail/queue failure does not expose debug output or report success", async () => {
  globalThis.fetch = async () => Response.json({ message: "private SMTP details and stack trace" }, { status: 500 });
  const response = await POST(new Request("https://frontend.example/api/auth/login/resend", {
    method: "POST", body: "{}",
  }), { params: Promise.resolve({ path: ["login", "resend"] }) });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /SMTP|stack trace/);
});


test("production refuses localhost and insecure upstreams without sending session cookies", async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousUpstream = process.env.API_UPSTREAM_URL;
  try {
    process.env.NODE_ENV = 'production';
    let upstreamCalls = 0;
    globalThis.fetch = () => { upstreamCalls++; throw new Error('Upstream must not be contacted'); };
    for (const upstream of ['http://localhost:8000', 'https://localhost', 'https://127.0.0.1', 'http://volymoly.com', 'https://user:secret@volymoly.com']) {
      process.env.API_UPSTREAM_URL = upstream;
      const response = await GET(new Request('https://studio.example/api/auth/me', {
        headers: { Cookie: 'laravel_session=private' },
      }), { params: Promise.resolve({ path: ['me'] }) });
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /secret|localhost|configuration/i);
    }
    assert.equal(upstreamCalls, 0);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
    if (previousUpstream === undefined) delete process.env.API_UPSTREAM_URL; else process.env.API_UPSTREAM_URL = previousUpstream;
  }
});
