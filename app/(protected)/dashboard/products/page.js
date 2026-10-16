import DashboardShell from "../../../../features/dashboard/components/dashboard-shell";
import ProductsView from "../../../../features/products/components/products-view";
import { verifySession } from "../../../../lib/dal/auth";
import { merchantStoreIsAccessible } from "../../../../lib/merchant-store-access";
import { fetchMerchantStores } from "../../../../lib/server/laravel-client";

export const metadata = { title: "Products" };

function singleValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const { user } = await verifySession();
  const stores = await fetchMerchantStores();
  const availableStores = stores || [];
  const requestedStore = singleValue(params.store);
  const selectedStore = availableStores.find((store) => (
    String(store.id) === String(requestedStore) && merchantStoreIsAccessible(store)
  )) || availableStores.find(merchantStoreIsAccessible) || availableStores[0] || null;

  return (
    <DashboardShell
      activeItem="Products"
      fullBleed
      initialStoreId={selectedStore ? String(selectedStore.id) : ""}
      serviceAvailable={stores !== null}
      stores={availableStores}
      user={user}
    >
      <ProductsView />
    </DashboardShell>
  );
}
