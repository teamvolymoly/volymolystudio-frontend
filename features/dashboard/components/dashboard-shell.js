"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authApi } from "../../auth/services/auth-api";
import styles from "./dashboard-shell.module.css";

const primaryItems = [
  { label: "Home", icon: "home" },
  { label: "Orders", icon: "orders" },
  { label: "Products", icon: "products" },
  { label: "Customers", icon: "home" },
  { label: "Growth", icon: "home" },
  { label: "Content", icon: "home" },
  { label: "Analytics", icon: "home" }
];

const bottomItems = ["Settings", "Notifications", "My Account"];

const iconPaths = {
  collapse: "/dashboard-icons/collapse.svg",
  home: "/dashboard-icons/home.svg",
  orders: "/dashboard-icons/orders.svg",
  products: "/dashboard-icons/products.svg",
  sales: "/dashboard-icons/sales-channel.svg"
};

function Icon({ name, small = false }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={small ? styles.smallIcon : styles.icon}
      height={small ? 16 : 20}
      src={iconPaths[name]}
      width={small ? 16 : 20}
    />
  );
}

function NavigationItem({ disabled = false, icon = "home", label, onClick }) {
  return (
    <button className={styles.navigationItem} disabled={disabled} onClick={onClick} type="button">
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function SalesChannel({ label }) {
  return (
    <section className={styles.salesGroup}>
      <div className={styles.smallLabel}>
        <span>Sales Channels</span>
        <Icon name="sales" small />
      </div>
      <NavigationItem label={label} />
    </section>
  );
}

export default function DashboardShell({ serviceAvailable, stores, user }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("Home");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutBusy = useRef(false);
  const firstActiveStore = stores.find((store) => store.status === "active") || stores[0] || null;
  const [selectedStoreId, setSelectedStoreId] = useState(
    firstActiveStore ? String(firstActiveStore.id) : ""
  );
  const selectedStore = stores.find((store) => String(store.id) === String(selectedStoreId)) || firstActiveStore;

  useEffect(() => {
    let active = true;

    authApi.me()
      .catch(() => {
        if (active) router.replace("/");
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    if (logoutBusy.current) return;

    logoutBusy.current = true;
    setLoggingOut(true);
    setLogoutError("");

    try {
      await authApi.logout();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setLogoutError(error.message || "We could not log you out. Please try again.");
    } finally {
      logoutBusy.current = false;
      setLoggingOut(false);
    }
  }

  if (checkingAuth) return null;

  return (
    <main className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside aria-label="Dashboard sidebar" className={styles.sidebar}>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={styles.collapseButton}
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <Icon name="collapse" />
        </button>

        <div className={styles.sidebarBody}>
          <div className={styles.sidebarUpper}>
            <nav aria-label="Main navigation" className={styles.navigationList}>
              {primaryItems.map((item) => (
                <NavigationItem
                  icon={item.icon}
                  key={item.label}
                  label={item.label}
                  onClick={() => setActiveItem(item.label)}
                />
              ))}
            </nav>

            <SalesChannel label={selectedStore?.name || "No store assigned"} />
          </div>

          <nav aria-label="Account navigation" className={styles.bottomNavigation}>
            {bottomItems.map((label) => (
              <NavigationItem key={label} label={label} onClick={() => setActiveItem(label)} />
            ))}
            <NavigationItem
              disabled={loggingOut}
              label={loggingOut ? "Logging out..." : "Log out"}
              onClick={logout}
            />
          </nav>
        </div>
      </aside>

      <section aria-label={`${activeItem} content`} className={styles.mainContainer}>
        {logoutError ? <p className={styles.logoutError} role="alert">{logoutError}</p> : null}
        <header className={styles.storeTopbar}>
          <div>
            <span>Merchant workspace</span>
            <strong>{selectedStore?.organization?.name || user.name}</strong>
          </div>
          {stores.length > 1 ? (
            <label className={styles.storeSelector}>
              Current store
              <select
                onChange={(event) => setSelectedStoreId(event.target.value)}
                value={selectedStoreId}
              >
                {stores.map((store) => (
                  <option key={store.id} value={String(store.id)}>
                    {store.name}{store.status !== "active" ? " (Suspended)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </header>

        <div className={styles.storeContent}>
          {!serviceAvailable ? (
            <div className={styles.storeNotice} role="alert">
              <strong>Store service unavailable</strong>
              <p>Laravel is not returning your store assignments. Please try again shortly.</p>
            </div>
          ) : selectedStore ? (
            <>
              <section className={styles.storeWelcome}>
                <div>
                  <span>{selectedStore.organization?.name || "Merchant organization"}</span>
                  <h1>{selectedStore.name}</h1>
                  <p>
                    You are connected as <b>{selectedStore.role || "member"}</b>. All future
                    commerce data will stay inside this store.
                  </p>
                </div>
                <span
                  className={`${styles.storeStatus} ${
                    selectedStore.status === "active" ? styles.active : styles.suspended
                  }`}
                >
                  {selectedStore.status}
                </span>
              </section>
              <section className={styles.storeCards}>
                <article><span>Store identifier</span><strong>/{selectedStore.slug}</strong><p>Used to identify this store securely.</p></article>
                <article><span>Currency</span><strong>{selectedStore.currency}</strong><p>Default transaction currency.</p></article>
                <article><span>Timezone</span><strong>{selectedStore.timezone}</strong><p>Used for orders and reporting.</p></article>
              </section>
              {selectedStore.status !== "active" ? (
                <div className={styles.suspendedNotice}>
                  This store is suspended. Contact the Platform Super Admin to restore access.
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyStore}>
              <span aria-hidden="true">＋</span>
              <strong>No store assigned yet</strong>
              <p>Ask the Platform Super Admin to create an organization and assign your registered email as Merchant Owner.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
