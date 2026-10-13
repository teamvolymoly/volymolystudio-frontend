import { notFound } from "next/navigation";
import DashboardShell from "../../../../../features/dashboard/components/dashboard-shell";
import OrderDetail from "../../../../../features/orders/components/order-detail";
import { verifySession } from "../../../../../lib/dal/auth";
import { merchantStoreIsAccessible, merchantStorePermissions } from "../../../../../lib/merchant-store-access";
import { fetchMerchantOrder, fetchMerchantStores } from "../../../../../lib/server/laravel-client";

export const metadata = { title: "Order details" };

function singleValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrderDetailPage({ params, searchParams }) {
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(String(orderId))) notFound();

  const { user } = await verifySession();
  const stores = await fetchMerchantStores();
  const availableStores = stores || [];
  const requestedStore = singleValue(query.store);
  const selectedStore = availableStores.find((store) => (
    String(store.id) === String(requestedStore)
    && merchantStoreIsAccessible(store)
    && merchantStorePermissions(store).orders.view
  )) || null;
  const order = selectedStore ? await fetchMerchantOrder(selectedStore.id, orderId) : null;

  return (
    <DashboardShell
      activeItem="Orders"
      initialStoreId={selectedStore ? String(selectedStore.id) : ""}
      serviceAvailable={stores !== null}
      stores={availableStores}
      user={user}
    >
      <OrderDetail order={order} selectedStore={selectedStore} />
    </DashboardShell>
  );
}
