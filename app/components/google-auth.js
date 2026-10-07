"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../lib/auth-api";

const googleErrors = {
  cancelled: "Google sign-in was cancelled. You can try again.",
  invalid_state: "Your Google sign-in session expired. Please start again from this page.",
  unverified_email: "Google did not return a verified email address. Try another account.",
  account_conflict: "This account could not be linked. Sign in with your existing login method.",
  not_configured: "Google sign-in is not available yet. Please use email and password.",
  failed: "Google sign-in could not be completed. Please try again.",
};

export function GoogleErrorNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("google_error");
    if (error) {
      setMessage(googleErrors[error] || googleErrors.failed);
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  if (!message) return null;

  return (
    <div className="notice notice-error" role="alert">
      <div className="notice-content">
        <Image alt="" className="notice-icon" height={20} src="/auth-icons/alert-error.svg" width={20} />
        <span>{message}</span>
      </div>
      <button className="notice-close" aria-label="Dismiss message" onClick={() => setMessage("")} type="button">
        <Image alt="" height={20} src="/auth-icons/close-error.svg" width={20} />
      </button>
    </div>
  );
}

export function GoogleLinkScreen({ onCancel }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function linkAccount(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      await authApi.linkGoogle(password);
      router.replace("/dashboard");
    } catch (failure) {
      setError(failure.errors?.password?.[0] || failure.message || "Unable to link your Google account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-content password-screen">
      <header className="intro centered">
        <h1>Connect your Google account</h1>
        <p>An account with this email already exists. Enter its current password to connect Google and sign in.</p>
      </header>
      <form className="stacked-form password-body" onSubmit={linkAccount}>
        <label className="field-block">
          <span className="field-label">Current account password</span>
          <span className={`input-wrap${error ? " has-error" : ""}`}>
            <input
              aria-invalid={Boolean(error)}
              autoComplete="current-password"
              maxLength={255}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </span>
        </label>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Connecting..." : "Connect Google and sign in"}
        </button>
        <p>Forgot your password? Return to login and use password recovery, then start Google sign-in again.</p>
        <button className="text-link accent" disabled={loading} onClick={onCancel} type="button">Back to login</button>
      </form>
    </div>
  );
}
