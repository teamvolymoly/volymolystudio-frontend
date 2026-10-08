import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig, {
  contentSecurityPolicy,
  securityHeaders,
} from "../next.config.mjs";

test("all frontend routes receive the production security headers", async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/:path*");
  assert.deepEqual(rules[0].headers, securityHeaders);

  const headers = new Map(securityHeaders.map(({ key, value }) => [key, value]));
  assert.equal(headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.match(headers.get("Permissions-Policy"), /camera=\(\)/);
  assert.equal(headers.get("Content-Security-Policy"), contentSecurityPolicy);
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(contentSecurityPolicy, /object-src 'none'/);
  assert.match(contentSecurityPolicy, /upgrade-insecure-requests/);
  assert.equal(nextConfig.poweredByHeader, false);
});
