import DashboardShell from "../../../features/dashboard/components/dashboard-shell";
import { verifySession } from "../../../lib/dal/auth";
import { fetchMerchantStores } from "../../../lib/server/laravel-client";

export default async function DashboardPage() {
  const { user } = await verifySession();
  const stores = await fetchMerchantStores();

  return <DashboardShell serviceAvailable={stores !== null} stores={stores || []} user={user} />;
}
