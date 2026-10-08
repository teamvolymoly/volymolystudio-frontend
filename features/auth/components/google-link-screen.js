"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "../../../components/ui/notice";
import { TextField } from "../../../components/ui/text-field";
import { authApi } from "../services/auth-api";
import { EmailSummary, LoginHeader } from "./auth-layout";

export default function GoogleLinkScreen({ fallbackEmail, goTo }) {
  const router = useRouter();
  const [email, setEmail] = useState(fallbackEmail);
  const [password, setPassword] = useState("");
  const [showRequired, setShowRequired] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(!fallbackEmail);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;

    authApi.googleLinkContext()
      .then((result) => {
        if (active) setEmail(result.email || fallbackEmail);
      })
      .catch((error) => {
        if (active && !fallbackEmail) {
          setErrorMessage(error.message || "This Google linking request expired. Please start Google login again.");
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [fallbackEmail]);

  async function linkAccount(event) {
    event.preventDefault();
    if (busy.current || checkingSession) return;
    if (!password.trim()) {
      setShowRequired(true);
      return;
    }

    busy.current = true;
    setLoading(true);
    setErrorMessage("");

    try {
      await authApi.linkGoogle(password);
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(error.errors?.password?.[0] || error.message || "Unable to link your Google account.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="screen-content password-screen with-notice">
      <LoginHeader />
      <div className="password-body">
        {showNotice ? (
          <Notice onDismiss={() => setShowNotice(false)} tone="warning">
            An account with this email already exists, and is not connected to Google.
          </Notice>
        ) : null}
        <form className="stacked-form" onSubmit={linkAccount}>
          <EmailSummary email={email} onChangeEmail={() => goTo("login", { email: "" })} />
          <TextField
            autoComplete="current-password"
            error={errorMessage || (showRequired ? "Enter your password" : "")}
            label="Password"
            onChange={(event) => {
              setPassword(event.target.value);
              setShowRequired(false);
              setErrorMessage("");
            }}
            placeholder="Enter your password"
            type="password"
            value={password}
          />
          <button className="forgot-link" onClick={() => goTo("forgot-password", { email })} type="button">
            Forgot password?
          </button>
          <button className="primary-button" disabled={loading || checkingSession} type="submit">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
