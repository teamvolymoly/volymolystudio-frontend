import DashboardShell from "../../../features/dashboard/components/dashboard-shell";
import { verifySession } from "../../../lib/dal/auth";

export default async function DashboardPage() {
  await verifySession();

  return <DashboardShell />;
}
