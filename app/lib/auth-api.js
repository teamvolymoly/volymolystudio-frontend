// Local development defaults to the local Laravel API. Deployments set the
// production URL explicitly through NEXT_PUBLIC_API_URL.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function getCsrfToken() {
  // Laravel rotates the session token after login/logout. Read the token for
  // the current session before every mutation instead of caching an old one.
  const response = await fetch(`${API_URL}/api/auth/csrf-token`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Unable to initialize the authentication session.");
  }
  const payload = await response.json();
  if (!payload.token) {
    throw new Error("The authentication session did not return a CSRF token.");
  }
  return payload.token;
}

async function request(path, options = {}, csrfRetry = false) {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const csrfToken = isMutation ? await getCsrfToken() : "";

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (isMutation) {
    headers.set("Content-Type", "application/json");

    if (csrfToken) headers.set("X-CSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 419 && isMutation && !csrfRetry) {
    // The browser may still hold a session from before a deployment. Refresh
    // the token/session pair once, then retry the same request.
    return request(path, options, true);
  }

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
