"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  merchantRoleLabel,
  merchantStoreAccessMessage,
  merchantStoreIsAccessible,
  merchantStorePermissions,
} from "../../../lib/merchant-store-access";
import { authApi } from "../../auth/services/auth-api";
import styles from "./dashboard-shell.module.css";

const primaryItems = [
  { label: "Home", icon: "home", href: "/dashboard" },
  { label: "Orders", icon: "orders", href: "/dashboard/orders" },
  { label: "Products", icon: "products", href: "/dashboard/products" },
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

function NavigationItem({ active = false, disabled = false, href, icon = "home", label, onClick }) {
  const className = `${styles.navigationItem} ${active ? styles.navigationItemActive : ""}`;
  if (href) {
    return (
      <Link aria-current={active ? "page" : undefined} className={className} href={href}>
        <Icon name={icon} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onClick} type="button">
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

function navigationHref(item, selectedStore, orderStore) {
  if (!item.href) return undefined;

  const store = item.label === "Orders" ? orderStore : selectedStore;
  if (item.label === "Orders" && !store) return undefined;

  return store ? `${item.href}?store=${encodeURIComponent(String(store.id))}` : item.href;
}

export default function DashboardShell({
  activeItem = "Home",
  children,
  fullBleed = false,
  initialStoreId = "",
  serviceAvailable,
  stores,
  user,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [currentItem, setCurrentItem] = useState(activeItem);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutBusy = useRef(false);
  const firstAccessibleStore = stores.find(merchantStoreIsAccessible) || null;
  const initialStore = stores.find((store) => String(store.id) === String(initialStoreId)) || null;
  const firstStore = initialStore || firstAccessibleStore || stores[0] || null;
  const [selectedStoreId, setSelectedStoreId] = useState(
    firstStore ? String(firstStore.id) : ""
  );
  const selectedStore = stores.find((store) => String(store.id) === String(selectedStoreId))
    || firstAccessibleStore
    || stores[0]
    || null;
  const selectedPermissions = merchantStorePermissions(selectedStore);
  const orderStores = stores.filter((store) => (
    merchantStoreIsAccessible(store) && merchantStorePermissions(store).orders.view
  ));
  const selectableStores = activeItem === "Orders" ? orderStores : stores;
  const orderStore = merchantStoreIsAccessible(selectedStore) && selectedPermissions.orders.view
    ? selectedStore
    : orderStores[0] || null;
  const selectedStoreAvailable = merchantStoreIsAccessible(selectedStore);

  useEffect(() => {
    setCurrentItem(activeItem);
  }, [activeItem]);

  useEffect(() => {
    if (initialStoreId) setSelectedStoreId(String(initialStoreId));
  }, [initialStoreId]);

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

  function selectStore(storeId) {
    setSelectedStoreId(storeId);
    const params = new URLSearchParams(window.location.search);
    params.set("store", storeId);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
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
                  active={currentItem === item.label}
                  disabled={item.label === "Orders" && !orderStore}
                  href={navigationHref(item, selectedStore, orderStore)}
                  icon={item.icon}
                  key={item.label}
                  label={item.label}
                />
              ))}
            </nav>

            <SalesChannel label={selectedStore?.name || "No store assigned"} />
          </div>

          <nav aria-label="Account navigation" className={styles.bottomNavigation}>
            {bottomItems.map((label) => (
              <NavigationItem
                active={currentItem === label}
                key={label}
                label={label}
                onClick={() => setCurrentItem(label)}
              />
            ))}
            <NavigationItem
              disabled={loggingOut}
              label={loggingOut ? "Logging out..." : "Log out"}
              onClick={logout}
            />
          </nav>
        </div>
      </aside>

      <section aria-label={`${currentItem} content`} className={styles.mainContainer}>
        {logoutError ? <p className={styles.logoutError} role="alert">{logoutError}</p> : null}
        {!fullBleed ? (
          <header className={styles.storeTopbar}>
            <div>
              <span>Merchant workspace</span>
              <strong>{selectedStore?.organization?.name || user.name}</strong>
            </div>
            {selectableStores.length > 1 ? (
              <label className={styles.storeSelector}>
                Current store
                <select
                  onChange={(event) => selectStore(event.target.value)}
                  value={selectedStoreId}
                >
                  {selectableStores.map((store) => (
                    <option key={store.id} value={String(store.id)}>
                      {store.name}{store.status !== "active" ? " (Suspended)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </header>
        ) : null}

        <div className={`${styles.storeContent} ${fullBleed ? styles.storeContentFullBleed : ""}`}>
          {!serviceAvailable ? (
            <div className={styles.storeNotice} role="alert">
              <strong>Store service unavailable</strong>
              <p>Laravel is not returning your store assignments. Please try again shortly.</p>
            </div>
          ) : children ? (
            children
          ) : selectedStore ? (
            <>
              <section className={styles.storeWelcome}>
                <div>
                  <span>{selectedStore.organization?.name || "Merchant organization"}</span>
                  <h1>{selectedStore.name}</h1>
                  <p>
                    You are connected as <b>{merchantRoleLabel(selectedStore.role)}</b>. Your
                    dashboard and orders stay isolated to this store.
                  </p>
                </div>
                <div className={styles.storeBadges}>
                  <span className={styles.roleBadge}>{merchantRoleLabel(selectedStore.role)}</span>
                  <span
                    className={`${styles.storeStatus} ${selectedStoreAvailable ? styles.active : styles.suspended}`}
                  >
                    {selectedStoreAvailable ? "active" : "suspended"}
                  </span>
                </div>
              </section>
              <section className={styles.storeCards}>
                <article><span>Store identifier</span><strong>/{selectedStore.slug}</strong><p>Used to identify this store securely.</p></article>
                <article><span>Currency</span><strong>{selectedStore.currency}</strong><p>Default transaction currency.</p></article>
                <article><span>Timezone</span><strong>{selectedStore.timezone}</strong><p>Used for orders and reporting.</p></article>
                <article>
                  <span>Order access</span>
                  <strong>{selectedPermissions.orders.manage ? "Manage" : "View only"}</strong>
                  <p>Controlled by your {merchantRoleLabel(selectedStore.role)} role.</p>
                </article>
              </section>
              {!selectedStoreAvailable ? (
                <div className={styles.suspendedNotice}>
                  {merchantStoreAccessMessage(selectedStore)}
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
