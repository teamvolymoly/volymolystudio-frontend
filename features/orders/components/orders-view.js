import Link from "next/link";
import { merchantRoleLabel, merchantStorePermissions } from "../../../lib/merchant-store-access";
import styles from "./orders-view.module.css";

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "completed", "cancelled"];

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

function pageHref(storeId, filters, page) {
  const params = new URLSearchParams({ store: String(storeId), page: String(page) });
  if (filters.status) params.set("status", filters.status);
  if (filters.query) params.set("query", filters.query);
  return `/dashboard/orders?${params.toString()}`;
}

export default function OrdersView({ filters, hasAssignments, ordersData, selectedStore }) {
  if (!selectedStore) {
    return (
      <div className={styles.emptyState}>
        <strong>{hasAssignments ? "No active store available" : "No store assigned yet"}</strong>
        <p>
          {hasAssignments
            ? "Your assigned stores are suspended or unavailable. Contact the Platform Super Admin."
            : "Orders will appear after a Platform Super Admin assigns you an active store."}
        </p>
      </div>
    );
  }

  if (!ordersData) {
    return (
      <div className={styles.errorState} role="alert">
        <strong>Orders service unavailable</strong>
        <p>Laravel could not return this store&apos;s orders. Please try again shortly.</p>
      </div>
    );
  }

  const { orders, pagination, summary } = ordersData;
  const currency = ordersData.store?.currency || selectedStore.currency;
  const permissions = merchantStorePermissions(selectedStore);

  return (
    <div className={styles.ordersPage}>
      <header className={styles.heading}>
        <div>
          <span>Order management</span>
          <h1>Orders</h1>
          <p>Only orders belonging to {selectedStore.name} are shown here.</p>
        </div>
        <div className={styles.headingBadges}>
          <span className={styles.storeBadge}>{selectedStore.name}</span>
          <span className={styles.roleBadge}>
            {merchantRoleLabel(selectedStore.role)} · {permissions.orders.manage ? "Manage" : "View only"}
          </span>
        </div>
      </header>

      <section aria-label="Order summary" className={styles.summaryGrid}>
        <article><span>All orders</span><strong>{summary.total_orders}</strong></article>
        <article><span>Open orders</span><strong>{summary.open_orders}</strong></article>
        <article><span>Completed</span><strong>{summary.completed_orders}</strong></article>
        <article><span>Paid sales</span><strong>{money(summary.paid_sales, currency)}</strong></article>
      </section>

      <form action="/dashboard/orders" className={styles.filters} method="get">
        <input name="store" type="hidden" value={selectedStore.id} />
        <label>
          Search
          <input
            defaultValue={filters.query}
            maxLength="100"
            name="query"
            placeholder="Order number, customer or email"
            type="search"
          />
        </label>
        <label>
          Status
          <select defaultValue={filters.status} name="status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{label(status)}</option>)}
          </select>
        </label>
        <button type="submit">Apply filters</button>
        {(filters.query || filters.status) ? (
          <Link className={styles.clearLink} href={`/dashboard/orders?store=${selectedStore.id}`}>Clear</Link>
        ) : null}
      </form>

      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No matching orders</strong>
          <p>{filters.query || filters.status ? "Try changing the current filters." : "New store orders will appear here."}</p>
        </div>
      ) : (
        <section className={styles.tableCard}>
          <div className={styles.tableMeta}>
            <strong>{pagination.total} {pagination.total === 1 ? "order" : "orders"}</strong>
            <span>Showing {pagination.from}–{pagination.to}</span>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Date</th><th>Payment</th><th>Status</th><th>Total</th></tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className={styles.orderLink} href={`/dashboard/orders/${order.id}?store=${selectedStore.id}`}>
                        {order.order_number}
                      </Link>
                      <small>{order.items_count} {order.items_count === 1 ? "item" : "items"}</small>
                    </td>
                    <td><strong>{order.customer?.name || "Guest customer"}</strong><small>{order.customer?.email || "No email"}</small></td>
                    <td>{dateTime(order.placed_at, selectedStore.timezone)}</td>
                    <td><span className={`${styles.status} ${styles[order.payment_status] || ""}`}>{label(order.payment_status)}</span></td>
                    <td><span className={`${styles.status} ${styles[order.status] || ""}`}>{label(order.status)}</span></td>
                    <td className={styles.amount}>{money(order.total_amount, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.last_page > 1 ? (
            <nav aria-label="Order pages" className={styles.pagination}>
              {pagination.current_page > 1 ? <Link href={pageHref(selectedStore.id, filters, pagination.current_page - 1)}>Previous</Link> : <span />}
              <span>Page {pagination.current_page} of {pagination.last_page}</span>
              {pagination.current_page < pagination.last_page ? <Link href={pageHref(selectedStore.id, filters, pagination.current_page + 1)}>Next</Link> : <span />}
            </nav>
          ) : null}
        </section>
      )}
    </div>
  );
}
