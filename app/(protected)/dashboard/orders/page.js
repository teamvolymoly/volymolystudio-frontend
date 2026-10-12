import DashboardShell from "../../../../features/dashboard/components/dashboard-shell";
import OrdersView from "../../../../features/orders/components/orders-view";
import { verifySession } from "../../../../lib/dal/auth";
import { fetchMerchantOrders, fetchMerchantStores } from "../../../../lib/server/laravel-client";

export const metadata = { title: "Orders" };

const STATUSES = new Set(["pending", "confirmed", "processing", "completed", "cancelled"]);

function singleValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrdersPage({ searchParams }) {
  const params = await searchParams;
  const { user } = await verifySession();
  const stores = await fetchMerchantStores();
  const availableStores = stores || [];
  const activeStores = availableStores.filter((store) => (
    store.status === "active" && store.organization?.status === "active"
  ));

  const requestedStore = singleValue(params.store);
  const selectedStore = activeStores.find((store) => String(store.id) === String(requestedStore))
    || activeStores[0]
    || null;
  const rawStatus = singleValue(params.status);
  const status = STATUSES.has(rawStatus) ? rawStatus : "";
  const query = String(singleValue(params.query) || "").trim().slice(0, 100);
  const requestedPage = Number.parseInt(singleValue(params.page), 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const orders = selectedStore
    ? await fetchMerchantOrders(selectedStore.id, { page, query, status })
    : null;

  return (
    <DashboardShell
      activeItem="Orders"
      initialStoreId={selectedStore ? String(selectedStore.id) : ""}
      serviceAvailable={stores !== null}
      stores={availableStores}
      user={user}
    >
      <OrdersView
        filters={{ page, query, status }}
        ordersData={orders}
        selectedStore={selectedStore}
      />
    </DashboardShell>
  );
}
