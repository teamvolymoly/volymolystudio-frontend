import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("merchant Products navigation opens the protected Figma-matched product route", async () => {
  const [shell, page, view, styles] = await Promise.all([
    readFile(new URL("../features/dashboard/components/dashboard-shell.js", import.meta.url), "utf8"),
    readFile(new URL("../app/(protected)/dashboard/products/page.js", import.meta.url), "utf8"),
    readFile(new URL("../features/products/components/products-view.js", import.meta.url), "utf8"),
    readFile(new URL("../features/products/components/products-view.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /label:\s*"Products",\s*icon:\s*"products",\s*href:\s*"\/dashboard\/products"/);
  assert.match(page, /verifySession\(\)/);
  assert.match(page, /activeItem="Products"/);
  assert.match(page, /fullBleed/);
  assert.match(view, /Search and filter/);
  assert.match(view, /Product type/);
  assert.match(styles, /grid-template-columns:\s*32px 280px repeat\(6,/);
  assert.match(styles, /#12b76a/);
  assert.match(styles, /#f79009/);
  assert.match(styles, /#595959/);
});

test("the Products view uses local copies of every visible Figma asset", async () => {
  await Promise.all([
    "../public/product-ui/product-thumbnail.png",
    "../public/product-ui/search.svg",
    "../public/product-ui/columns.svg",
    "../public/product-ui/checkbox-checked.svg",
  ].map((path) => access(new URL(path, import.meta.url))));
});

test("Products are loaded from the selected merchant store instead of a static frontend list", async () => {
  const [page, view, client] = await Promise.all([
    readFile(new URL("../app/(protected)/dashboard/products/page.js", import.meta.url), "utf8"),
    readFile(new URL("../features/products/components/products-view.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/server/laravel-client.js", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetchMerchantProducts\(selectedStore\.id\)/);
  assert.match(page, /<ProductsView products=\{products \|\| \[\]\} \/>/);
  assert.doesNotMatch(view, /const PRODUCTS\s*=/);
  assert.match(view, /export default function ProductsView\(\{ products \}\)/);
  assert.match(client, /\/api\/v1\/merchant\/stores\/\$\{encodeURIComponent\(String\(storeId\)\)\}\/products/);
});
