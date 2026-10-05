"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "../lib/auth-api";
import styles from "./dashboard.module.css";

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

function NavigationItem({ icon = "home", label, onClick }) {
  return (
    <button className={styles.navigationItem} onClick={onClick} type="button">
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

export default function DashboardPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("Home");
  const [checkingAuth, setCheckingAuth] = useState(true);

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

            <SalesChannel label="My Store" />
            <SalesChannel label="Bingoflo" />
          </div>

          <nav aria-label="Account navigation" className={styles.bottomNavigation}>
            {bottomItems.map((label) => (
              <NavigationItem key={label} label={label} onClick={() => setActiveItem(label)} />
            ))}
          </nav>
        </div>
      </aside>

      <section aria-label={`${activeItem} content`} className={styles.mainContainer} />
    </main>
  );
}
