import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { authApi } from "../app/lib/auth-api.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("password and OTP requests obtain fresh CSRF tokens and preserve the session", async () => {
  const calls = [];
  let csrfCount = 0;
  globalThis.fetch = async (path, options) => {
    assert.equal(options.credentials, "include");
    if (path === "/api/auth/csrf-token") return Response.json({ token: "csrf-" + ++csrfCount });
    assert.equal(options.headers.get("X-CSRF-TOKEN"), "csrf-" + csrfCount);
    calls.push([path, options.body ? JSON.parse(options.body) : null]);
    if (path === "/api/auth/login") return Response.json({ otp_required: true, email: "user@example.test" }, { status: 202 });
    if (path === "/api/auth/login/resend") return Response.json({ message: "Sent" }, { status: 202 });
    return Response.json({ user: { id: 7 } });
  };
  assert.equal((await authApi.login("user@example.test", "password")).otp_required, true);
  await authApi.resendLoginCode();
  assert.equal((await authApi.verifyLoginCode("012345")).user.id, 7);
  assert.equal(csrfCount, 3);
  assert.deepEqual(calls, [
    ["/api/auth/login", { email: "user@example.test", password: "password" }],
    ["/api/auth/login/resend", null],
    ["/api/auth/login/verify", { code: "012345" }],
  ]);
});

test("expired OTP exposes restart instruction to the screen", async () => {
  globalThis.fetch = async (path) => path === "/api/auth/csrf-token"
    ? Response.json({ token: "csrf" })
    : Response.json({ message: "Sign in again", restart_login: true }, { status: 422 });
  await assert.rejects(authApi.verifyLoginCode("012345"), (error) => {
    assert.equal(error.restartLogin, true);
    assert.equal(error.status, 422);
    return true;
  });
});


test("resend exposes server cooldown without pretending email was sent", async () => {
  globalThis.fetch = async (path) => path === "/api/auth/csrf-token"
    ? Response.json({ token: "csrf" })
    : Response.json({ message: "Please wait", retry_after: 40 }, { status: 429, headers: { "Retry-After": "40" } });
  await assert.rejects(authApi.resendLoginCode(), (error) => error.status === 429 && error.retryAfter === 40);
});

test("requesting a replacement reset link uses Laravel with fresh CSRF", async () => {
  let requests = 0;
  globalThis.fetch = async (path, options) => {
    assert.equal(options.credentials, "include");
    if (path === "/api/auth/csrf-token") return Response.json({ token: "reset-csrf" });
    requests++;
    assert.equal(path, "/api/auth/password/forgot");
    assert.equal(options.headers.get("X-CSRF-TOKEN"), "reset-csrf");
    assert.deepEqual(JSON.parse(options.body), { email: "user@example.test" });
    return Response.json({ message: "If an account exists, a link will arrive", retry_after: 60 }, { status: 202 });
  };
  assert.equal((await authApi.forgotPassword("user@example.test")).retry_after, 60);
  assert.equal(requests, 1);
});
