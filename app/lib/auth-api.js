// Vercel does not receive the local .env.local file. Keep the production API
// as the safe deployment fallback while still allowing local env overrides.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://volymoly.com").replace(/\/$/, "");

let csrfRequest;
let csrfToken = "";

function getCookie(name) {
  if (typeof document === "undefined") return "";

  const row = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  return row ? decodeURIComponent(row.split("=").slice(1).join("=")) : "";
}

async function ensureCsrfCookie() {
  if (csrfToken || getCookie("XSRF-TOKEN")) return;

  if (!csrfRequest) {
    csrfRequest = fetch(`${API_URL}/api/auth/csrf-token`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to initialize the authentication session.");
        }
        const payload = await response.json();
        csrfToken = payload.token || "";
      })
      .catch((error) => {
        csrfRequest = undefined;
        throw error;
      });
  }

  await csrfRequest;
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (isMutation) await ensureCsrfCookie();

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (isMutation) {
    headers.set("Content-Type", "application/json");

    const token = csrfToken || getCookie("XSRF-TOKEN");
    if (token) headers.set("X-CSRF-TOKEN", token);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const responseText = await response.text();
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { message: responseText };
    }
  }

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    error.errors = payload.errors || {};
    throw error;
  }

  return payload;
}

export const authApi = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request("/api/auth/me"),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  sendVerificationCode: (email, purpose = "registration", requestId) =>
    request("/api/auth/verification/send", {
      method: "POST",
      body: JSON.stringify({
        email,
        purpose,
        ...(requestId ? { request_id: requestId } : {}),
      }),
    }),

  verifyCode: (email, code, purpose = "registration", requestId) =>
    request("/api/auth/verification/verify", {
      method: "POST",
      body: JSON.stringify({
        email,
        code,
        purpose,
        ...(requestId ? { request_id: requestId } : {}),
      }),
    }),

  forgotPassword: (email) =>
    request("/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: ({ email, token, password, passwordConfirmation }) =>
    request("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      }),
    }),

  recoverAccount: ({ newEmail, accountEmail }) =>
    request("/api/auth/account/recover", {
      method: "POST",
      body: JSON.stringify({
        new_email: newEmail,
        ...(accountEmail ? { account_email: accountEmail } : {}),
      }),
    }),
};
