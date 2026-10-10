import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { authApi } from "../features/auth/services/auth-api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("activity review is read-only and secure action uses fresh CSRF", async () => {
  const token = "b".repeat(64);
  let csrfCalls = 0;

  globalThis.fetch = async (path, options) => {
    assert.equal(options.credentials, "include");

    if (path === "/api/auth/security/activity") {
      assert.equal(options.method, "GET");
      assert.equal(options.headers.get("X-Activity-Token"), token);
      return Response.json({ activity: { email: "user@example.test", secured: false } });
    }

    if (path === "/api/auth/csrf-token") {
      csrfCalls++;
      return Response.json({ token: "security-csrf" });
    }

    assert.equal(path, "/api/auth/security/secure");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("X-CSRF-TOKEN"), "security-csrf");
    assert.deepEqual(JSON.parse(options.body), { token });
    return Response.json({ secured: true, already_secured: false });
  };

  const activity = await authApi.loginActivity(token);
  assert.equal(activity.activity.email, "user@example.test");

  const secured = await authApi.secureLoginActivity(token);
  assert.equal(secured.secured, true);
  assert.equal(csrfCalls, 1);
});
