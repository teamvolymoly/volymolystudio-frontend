"use client";

import { useRef, useState } from "react";
import { Notice } from "../../../components/ui/notice";
import { TextField } from "../../../components/ui/text-field";
import { EmailSummary, LoginHeader } from "./auth-layout";

export default function PasswordScreen({ email, goTo, onLogin, invalid = false, notice }) {
  const [password, setPassword] = useState("");
  const [showRequired, setShowRequired] = useState(false);
  const [showNotice, setShowNotice] = useState(Boolean(notice));
  const [errorMessage, setErrorMessage] = useState(invalid ? "Incorrect Password" : "");
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  return (
    <div className={`screen-content password-screen${notice ? " with-notice" : ""}`}>
      <LoginHeader />
      <div className="password-body">
        {showNotice ? (
          <Notice onDismiss={() => setShowNotice(false)} tone={notice.tone}>{notice.message}</Notice>
        ) : null}
        <form
          className="stacked-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy.current) return;
            if (!password.trim()) {
              setShowRequired(true);
              return;
            }
            if (!email) {
              goTo("login");
              return;
            }

            busy.current = true;
            setLoading(true);
            setErrorMessage("");

            try {
              const result = await onLogin(email, password);
              if (!result.otp_required) {
                throw new Error("Unable to start login verification. Please try again.");
              }
              setPassword("");
              goTo("verify", {
                email: result.email || email,
                verification: { email: result.email || email, purpose: "login", requestId: "" },
              });
            } catch (error) {
              if (error.errors?.email) {
                goTo("email-error");
                return;
              }
              setErrorMessage(error.status === 401 ? "Incorrect Password" : (error.message || "Incorrect Password"));
            } finally {
              busy.current = false;
              setLoading(false);
            }
          }}
        >
          <EmailSummary email={email} onChangeEmail={() => goTo("login")} />
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
          <button className="forgot-link" onClick={() => goTo("forgot-password")} type="button">
            Forgot password?
          </button>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
