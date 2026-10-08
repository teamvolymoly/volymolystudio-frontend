"use client";

import { useEffect } from "react";
import { authApi } from "../services/auth-api";

export default function GoogleScreen() {
  useEffect(() => {
    // Keep the Figma redirect state visible for a paint, then hand the browser
    // to Laravel's stateful OAuth endpoint. Clearing the temporary query first
    // prevents the Back button from starting Google sign-in again.
    window.history.replaceState({}, "", window.location.pathname);
    const redirectTimer = window.setTimeout(() => authApi.startGoogleLogin(), 100);

    return () => window.clearTimeout(redirectTimer);
  }, []);

  return (
    <div aria-live="polite" className="screen-content message-screen google-screen" role="status">
      <h1>Redirecting to Google</h1>
      <p>This will only take a moment......</p>
    </div>
  );
}

