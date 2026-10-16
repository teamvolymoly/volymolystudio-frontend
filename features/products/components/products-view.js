"use client";

import { useMemo, useState } from "react";
import styles from "./products-view.module.css";

const PRODUCTS = [
  {
    id: 1,
    name: "Lumeramist Glow Muse Invisible Finish Sunscreen SPF 50",
    status: "active",
    inventory: 500,
    category: "Uncategorized",
    channels: 2,
    productType: "Skin Care",
    vendor: "My Store",
  },
  {
    id: 2,
    name: "Lumeramist Green Bloom Cleaning Form Facewash",
    status: "draft",
    inventory: 0,
    category: "Skin Care Masks & Peels",
    channels: 2,
    productType: "Skin Care",
    vendor: "My Store",
  },
  {
    id: 3,
    name: "Lumeramist Velvet Night Retinol Cream",
    status: "unlisted",
    inventory: 10,
    category: "Uncategorized",
    channels: 2,
    productType: "Skin Care",
    vendor: "My Store",
  },
  {
    id: 4,
    name: "Lumeramist Skin Code PDRN Collagen Serum",
    status: "draft",
    inventory: 10,
    category: "Uncategorized",
    channels: 2,
    productType: "Skin Care",
    vendor: "My Store",
  },
];

const HEADERS = ["Product", "Status", "Inventory", "Category", "Channels", "Product type", "Vendor"];

function ProductCheckbox({ checked, label, onChange }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ""}`}
      onClick={onChange}
      role="checkbox"
      type="button"
    >
      {checked ? <img alt="" height="9" src="/product-ui/checkbox-checked.svg" width="12" /> : null}
    </button>
  );
}

function StatusTag({ status }) {
  return <span className={`${styles.status} ${styles[status]}`}>{status}</span>;
}

export default function ProductsView() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const products = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return PRODUCTS;

    return PRODUCTS.filter((product) => (
      [product.name, product.status, product.category, product.productType, product.vendor]
        .some((value) => value.toLowerCase().includes(search))
    ));
  }, [query]);
  const allSelected = products.length > 0 && products.every((product) => selected.has(product.id));

  function toggleProduct(productId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) products.forEach((product) => next.delete(product.id));
      else products.forEach((product) => next.add(product.id));
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <section aria-label="Products" className={styles.tableCard}>
        <div className={styles.toolbar}>
          <label className={styles.searchBar}>
            <img alt="" height="20" src="/product-ui/search.svg" width="20" />
            <input
              aria-label="Search and filter products"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search and filter"
              type="search"
              value={query}
            />
          </label>
          <button aria-label="Choose product table columns" className={styles.columnsButton} type="button">
            <img alt="" height="24" src="/product-ui/columns.svg" width="24" />
          </button>
        </div>

        <div className={styles.tableViewport}>
          <div aria-colcount="8" aria-rowcount={products.length + 1} className={styles.table} role="table">
            <div className={`${styles.gridRow} ${styles.headerRow}`} role="row">
              <div className={`${styles.headerCell} ${styles.checkboxHeader}`} role="columnheader">
                <ProductCheckbox checked={allSelected} label="Select all products" onChange={toggleAll} />
              </div>
              {HEADERS.map((header, index) => (
                <div
                  className={`${styles.headerCell} ${index === HEADERS.length - 1 ? styles.lastHeaderCell : ""}`}
                  key={header}
                  role="columnheader"
                >
                  {header}
                </div>
              ))}
            </div>

            <div className={styles.tableBody} role="rowgroup">
              {products.map((product) => (
                <div className={`${styles.gridRow} ${styles.productRow}`} key={product.id} role="row">
                  <div className={`${styles.bodyCell} ${styles.checkboxCell}`} role="cell">
                    <ProductCheckbox
                      checked={selected.has(product.id)}
                      label={`Select ${product.name}`}
                      onChange={() => toggleProduct(product.id)}
                    />
                  </div>
                  <div className={`${styles.bodyCell} ${styles.productCell}`} role="cell">
                    <img
                      alt=""
                      className={styles.productImage}
                      height="36"
                      src="/product-ui/product-thumbnail.png"
                      width="36"
                    />
                    <span>{product.name}</span>
                  </div>
                  <div className={`${styles.bodyCell} ${styles.statusCell}`} role="cell">
                    <StatusTag status={product.status} />
                  </div>
                  <div className={`${styles.bodyCell} ${product.inventory === 0 ? styles.inventoryEmpty : ""}`} role="cell">
                    {product.inventory} in stock
                  </div>
                  <div className={styles.bodyCell} role="cell">{product.category}</div>
                  <div className={styles.bodyCell} role="cell">{product.channels}</div>
                  <div className={styles.bodyCell} role="cell">{product.productType}</div>
                  <div className={styles.bodyCell} role="cell">{product.vendor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
