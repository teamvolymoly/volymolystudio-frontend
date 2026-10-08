import { verifySession } from "../../lib/dal/auth";

export default async function ProtectedLayout({ children }) {
  await verifySession();

  return children;
}
