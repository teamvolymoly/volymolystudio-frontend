"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
