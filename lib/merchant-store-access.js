const STORE_ROLES = new Set(["owner", "admin", "manager", "staff"]);

function fallbackPermissions(role) {
  const knownRole = STORE_ROLES.has(role);
  const administersStore = role === "owner" || role === "admin";
  const managesOrders = administersStore || role === "manager";

  return {
    store: { view: knownRole, manage: administersStore },
    orders: { view: knownRole, manage: managesOrders },
    members: { manage: administersStore },
  };
}

export function merchantStorePermissions(store) {
  const fallback = fallbackPermissions(store?.role);
  const permissions = store?.permissions;

  return {
    store: {
      view: typeof permissions?.store?.view === "boolean" ? permissions.store.view : fallback.store.view,
      manage: typeof permissions?.store?.manage === "boolean" ? permissions.store.manage : fallback.store.manage,
    },
    orders: {
      view: typeof permissions?.orders?.view === "boolean" ? permissions.orders.view : fallback.orders.view,
      manage: typeof permissions?.orders?.manage === "boolean" ? permissions.orders.manage : fallback.orders.manage,
    },
    members: {
      manage: typeof permissions?.members?.manage === "boolean" ? permissions.members.manage : fallback.members.manage,
    },
  };
}

export function merchantStoreIsAccessible(store) {
  if (!store || store.status !== "active" || store.organization?.status !== "active") {
    return false;
  }

  if (typeof store.access?.available === "boolean" && !store.access.available) {
    return false;
  }

  return merchantStorePermissions(store).store.view;
}

export function merchantStoreAccessMessage(store) {
  const reason = store?.access?.reason;

  if (reason === "organization_suspended" || store?.organization?.status !== "active") {
    return "This merchant organization is suspended. Contact the Platform Super Admin to restore access.";
  }
  if (reason === "store_suspended" || store?.status !== "active") {
    return "This store is suspended. Contact the Platform Super Admin to restore access.";
  }
  if (!merchantStorePermissions(store).store.view) {
    return "Your assigned role does not allow access to this store.";
  }

  return "This store is currently unavailable.";
}

export function merchantRoleLabel(role) {
  return STORE_ROLES.has(role)
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Member";
}
