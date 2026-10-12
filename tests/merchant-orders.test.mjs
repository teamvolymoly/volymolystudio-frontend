import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("merchant Orders navigation points to a real protected route", async () => {
  const [shell, page] = await Promise.all([
    readFile(new URL("../features/dashboard/components/dashboard-shell.js", import.meta.url), "utf8"),
    readFile(new URL("../app/(protected)/dashboard/orders/page.js", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /href:\s*"\/dashboard\/orders"/);
  assert.match(page, /verifySession\(\)/);
  assert.match(page, /fetchMerchantOrders\(selectedStore\.id/);
});

test("server-side order loading stays scoped to the selected merchant store", async () => {
  const client = await readFile(
    new URL("../lib/server/laravel-client.js", import.meta.url),
    "utf8",
  );

  assert.match(client, /\/api\/v1\/merchant\/stores\/\$\{encodeURIComponent\(String\(storeId\)\)\}\/orders/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_API_URL/);
});
