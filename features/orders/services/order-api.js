import { getCsrfToken } from "../../auth/services/auth-api";

function validId(value) {
  return ["number", "string"].includes(typeof value) && /^\d+$/.test(String(value));
}

function errorMessage(payload) {
  const firstValidationMessage = Object.values(payload?.errors || {})
    .flat()
    .find((message) => typeof message === "string");

  return firstValidationMessage || payload?.message || "The order could not be updated.";
}

async function updateOrder(storeId, orderId, changes, csrfRetry = false) {
  if (!validId(storeId) || !validId(orderId)) {
    throw new Error("Invalid order selection.");
  }

  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/merchant/stores/${storeId}/orders/${orderId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(changes),
  });

  if (response.status === 419 && !csrfRetry) {
    return updateOrder(storeId, orderId, changes, true);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(errorMessage(payload));
    error.status = response.status;
    error.errors = payload.errors || {};
    throw error;
  }

  return payload;
}

export const orderApi = { updateOrder };
