"use client";

import Link from "next/link";
import { useState } from "react";
import { merchantRoleLabel, merchantStorePermissions } from "../../../lib/merchant-store-access";
import { orderApi } from "../services/order-api";
import styles from "./order-detail.module.css";

const FIELDS = ["status", "payment_status", "fulfillment_status"];

function label(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function money(value, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value, timezone) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "Asia/Kolkata",
  }).format(new Date(value));
}

function initialDraft(order) {
  return Object.fromEntries(FIELDS.map((field) => [field, order?.[field] || ""]));
}

function fieldOptions(order, field) {
  return [order[field], ...(order.allowed_transitions?.[field] || [])];
}

export default function OrderDetail({ order: initialOrder, selectedStore }) {
  const [order, setOrder] = useState(initialOrder);
  const [draft, setDraft] = useState(() => initialDraft(initialOrder));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  if (!selectedStore) {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Order access unavailable</strong>
        <p>Select an active assigned store from the Orders page and try again.</p>
        <Link href="/dashboard/orders">Back to orders</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.stateCard} role="alert">
        <strong>Order not found</strong>
        <p>This order does not belong to the selected store, or the service is unavailable.</p>
        <Link href={`/dashboard/orders?store=${selectedStore.id}`}>Back to orders</Link>
      </div>
    );
  }

  const permissions = merchantStorePermissions(selectedStore);
  const changes = Object.fromEntries(FIELDS
    .filter((field) => draft[field] && draft[field] !== order[field])
    .map((field) => [field, draft[field]]));
  const hasChanges = Object.keys(changes).length > 0;

  async function save(event) {
    event.preventDefault();
    if (!permissions.orders.manage || !hasChanges || saving) return;

    setSaving(true);
    setNotice(null);
    try {
      const payload = await orderApi.updateOrder(selectedStore.id, order.id, changes);
      setOrder(payload.order);
      setDraft(initialDraft(payload.order));
      setNotice({ type: "success", message: payload.message || "Order updated successfully." });
    } catch (error) {
      setNotice({ type: "error", message: error.message || "The order could not be updated." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.breadcrumbs}>
        <Link href={`/dashboard/orders?store=${selectedStore.id}`}>Orders</Link>
        <span aria-hidden="true">/</span>
        <span>{order.order_number}</span>
      </div>

      <header className={styles.heading}>
        <div>
          <span>Order details</span>
          <h1>{order.order_number}</h1>
          <p>Placed {dateTime(order.placed_at, selectedStore.timezone)} through {label(order.channel)}.</p>
        </div>
        <span className={`${styles.status} ${styles[order.status] || ""}`}>{label(order.status)}</span>
      </header>

      {notice ? (
        <div className={`${styles.notice} ${styles[notice.type]}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.message}
        </div>
      ) : null}

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <div><span>Workflow</span><h2>Order state</h2></div>
              <small>{merchantRoleLabel(selectedStore.role)} · {permissions.orders.manage ? "Manage" : "View only"}</small>
            </div>

            {!permissions.orders.manage ? (
              <div className={styles.readOnlyNotice}>Your role can view this order but cannot change its state.</div>
            ) : null}

            <form className={styles.stateForm} onSubmit={save}>
              {FIELDS.map((field) => {
                const options = fieldOptions(order, field);
                const title = field === "status" ? "Order status" : label(field);
                return (
                  <label key={field}>
                    {title}
                    <select
                      disabled={!permissions.orders.manage || saving || options.length === 1}
                      onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                      value={draft[field]}
                    >
                      {options.map((option) => <option key={option} value={option}>{label(option)}</option>)}
                    </select>
                    {options.length === 1 ? <small>No further transition available.</small> : null}
                  </label>
                );
              })}
              {permissions.orders.manage ? (
                <button disabled={!hasChanges || saving} type="submit">
                  {saving ? "Saving changes..." : "Save changes"}
                </button>
              ) : null}
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}><div><span>Customer</span><h2>Contact details</h2></div></div>
            <dl className={styles.detailsList}>
              <div><dt>Name</dt><dd>{order.customer?.name || "Guest customer"}</dd></div>
              <div><dt>Email</dt><dd>{order.customer?.email || "Not provided"}</dd></div>
              <div><dt>Phone</dt><dd>{order.customer?.phone || "Not provided"}</dd></div>
              <div><dt>Items</dt><dd>{order.items_count}</dd></div>
            </dl>
          </section>
        </div>

        <aside className={styles.card}>
          <div className={styles.cardHeading}><div><span>Payment</span><h2>Order total</h2></div></div>
          <dl className={styles.amounts}>
            <div><dt>Subtotal</dt><dd>{money(order.subtotal_amount, order.currency)}</dd></div>
            <div><dt>Discount</dt><dd>− {money(order.discount_amount, order.currency)}</dd></div>
            <div><dt>Tax</dt><dd>{money(order.tax_amount, order.currency)}</dd></div>
            <div><dt>Shipping</dt><dd>{money(order.shipping_amount, order.currency)}</dd></div>
            <div className={styles.total}><dt>Total</dt><dd>{money(order.total_amount, order.currency)}</dd></div>
          </dl>
          <div className={styles.timestamps}>
            <span>Last updated</span>
            <strong>{dateTime(order.updated_at, selectedStore.timezone)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
