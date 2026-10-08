"use client";

import { useRef, useState } from "react";
import { Notice } from "../../../components/ui/notice";
import { AlertIcon, TextField } from "../../../components/ui/text-field";
import { useResendCooldown } from "../hooks/use-resend-cooldown";
import { isValidEmail } from "../validation/email";
import { EmailSummary, LoginHeader } from "./auth-layout";

export default function ForgotPasswordScreen({ email, goTo, onForgotPassword, state }) {
  const [targetEmail, setTargetEmail] = useState(email);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [resendWait, startCooldown] = useResendCooldown();
  const busy = useRef(false);
  const expired = state === "expired";

  async function sendResetLink(event) {
    event.preventDefault();
    if (busy.current || resendWait > 0) return;
    const address = targetEmail.trim();
    if (!isValidEmail(address)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }
    busy.current = true;
    setLoading(true);
    setErrorMessage("");
    setNoticeVisible(false);
    try {
      const result = await onForgotPassword(address);
      startCooldown(result.retry_after || 60);
      setNoticeVisible(true);
      goTo("link-sent", { email: address, resetToken: "" });
    } catch (error) {
      setErrorMessage(error.message || "We could not send a reset link.");
      if (error.status === 429) startCooldown(error.retryAfter || 60);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="screen-content password-screen forgot-screen">
      <LoginHeader
        subtitle={
          expired
            ? "Continue to volymoly"
            : <>We’ll email instructions to {targetEmail || "your email"}<br />on how to reset it</>
        }
        title={expired ? "Log in" : "Forgot your password?"}
      />
      <div className="password-body">
        {noticeVisible && expired ? (
          <Notice tone="error" onDismiss={() => setNoticeVisible(false)}>
            Link expired. Enter your email below to receive a new reset link.
          </Notice>
        ) : null}
        <form className="stacked-form" onSubmit={sendResetLink}>
          {!email ? (
            <TextField label="Email" autoComplete="email" value={targetEmail}
              onChange={(event) => { setTargetEmail(event.target.value); setErrorMessage(""); }}
              placeholder="Enter your account email" />
          ) : (
            <EmailSummary email={targetEmail} onChangeEmail={() => goTo("login")} />
          )}
          {errorMessage ? <p className="field-error" role="alert"><AlertIcon />{errorMessage}</p> : null}
          <button className="primary-button" disabled={loading || resendWait > 0} type="submit">
            {loading ? "Sending..." : resendWait > 0 ? "Please wait " + resendWait + "s" : "Email password reset"}
          </button>
          <p className="recovery-copy">
            Lost access to email?{" "}
            <button className="text-link accent" onClick={() => goTo("recover-account")} type="button">
              Recover Account
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
