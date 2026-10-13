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
  assert.match(page, /merchantStoreIsAccessible/);
});

test("server-side order loading stays scoped to the selected merchant store", async () => {
  const client = await readFile(
    new URL("../lib/server/laravel-client.js", import.meta.url),
    "utf8",
  );

  assert.match(client, /\/api\/v1\/merchant\/stores\/\$\{encodeURIComponent\(String\(storeId\)\)\}\/orders/);
  assert.doesNotMatch(client, /NEXT_PUBLIC_API_URL/);
});

test("merchant workspace persists store selection and uses role capabilities", async () => {
  const [dashboardPage, shell, access] = await Promise.all([
    readFile(new URL("../app/(protected)/dashboard/page.js", import.meta.url), "utf8"),
    readFile(new URL("../features/dashboard/components/dashboard-shell.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/merchant-store-access.js", import.meta.url), "utf8"),
  ]);

  assert.match(dashboardPage, /initialStoreId/);
  assert.match(shell, /params\.set\("store", storeId\)/);
  assert.match(shell, /merchantStorePermissions\(selectedStore\)/);
  assert.match(access, /role === "owner" \|\| role === "admin"/);
  assert.match(access, /role === "manager"/);
  assert.match(access, /organization_suspended/);
});

test("order rows open a scoped detail page with role-aware state updates", async () => {
  const [list, detailPage, detail, service, client] = await Promise.all([
    readFile(new URL("../features/orders/components/orders-view.js", import.meta.url), "utf8"),
    readFile(new URL("../app/(protected)/dashboard/orders/[orderId]/page.js", import.meta.url), "utf8"),
    readFile(new URL("../features/orders/components/order-detail.js", import.meta.url), "utf8"),
    readFile(new URL("../features/orders/services/order-api.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/server/laravel-client.js", import.meta.url), "utf8"),
  ]);

  assert.match(list, /\/dashboard\/orders\/\$\{order\.id\}\?store=/);
  assert.match(detailPage, /fetchMerchantOrder\(selectedStore\.id, orderId\)/);
  assert.match(detail, /permissions\.orders\.manage/);
  assert.match(detail, /allowed_transitions/);
  assert.match(service, /method:\s*"PATCH"/);
  assert.match(client, /export async function fetchMerchantOrder/);
});
