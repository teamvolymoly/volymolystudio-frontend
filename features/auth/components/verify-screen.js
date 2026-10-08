"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "../../../components/ui/notice";
import { AlertIcon } from "../../../components/ui/text-field";
import { useResendCooldown } from "../hooks/use-resend-cooldown";

export default function VerifyScreen({
  email,
  purpose = "registration",
  requestId,
  goTo,
  onVerifyCode,
  onSendVerification,
  initialError = "",
  initialCodeSent = false,
}) {
  const router = useRouter();
  const busy = useRef(false);
  const focusFirstInput = useRef(false);
  const [restartRequired, setRestartRequired] = useState(false);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeSent, setCodeSent] = useState(initialCodeSent);
  const [resendWait, startResendCooldown] = useResendCooldown();
  const inputs = useRef([]);
  const completeCode = digits.every((digit) => /^\d$/.test(digit));

  useEffect(() => {
    if (focusFirstInput.current && !loading && !resending && !restartRequired) {
      inputs.current[0]?.focus();
      focusFirstInput.current = false;
    }
  }, [loading, resending, restartRequired]);

  async function submitCode(code) {
    if (busy.current || restartRequired || !email) return;
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("Enter the complete 6 digit code.");
      return;
    }
    busy.current = true;

    setLoading(true);
    setErrorMessage("");
    setCodeSent(false);

    try {
      await onVerifyCode(email, code, purpose, requestId);
      if (purpose === "login") {
        router.replace("/dashboard");
      } else {
        goTo("password");
      }
    } catch (error) {
      setErrorMessage(error.message || "The verification code is invalid or expired.");
      setRestartRequired(error.restartLogin === true);
      setDigits(["", "", "", "", "", ""]);
      focusFirstInput.current = true;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  function updateDigit(event, index) {
    const value = event.target.value.replace(/\D/g, "");
    if (value.length === 6) {
      setDigits(value.split(""));
      setErrorMessage("");
      inputs.current[5]?.focus();
      return;
    }
    const digit = value.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);
    setErrorMessage("");

    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  async function resendCode() {
    if (!email || busy.current || restartRequired || resendWait > 0) return;

    busy.current = true;
    setResending(true);
    setErrorMessage("");
    setCodeSent(false);

    try {
      const result = await onSendVerification(email, purpose, requestId);
      startResendCooldown(result.retry_after || 60);
      setCodeSent(true);
      setDigits(["", "", "", "", "", ""]);
      focusFirstInput.current = true;
    } catch (error) {
      setErrorMessage(error.message || "We could not resend the verification code.");
      if (error.status === 429 && !error.restartLogin) startResendCooldown(error.retryAfter || 60);
      setRestartRequired(error.restartLogin === true);
    } finally {
      busy.current = false;
      setResending(false);
    }
  }

  return (
    <div className="screen-content verify-screen">
      <header className="intro centered">
        <h1>{purpose === "account_recovery" ? "Verify your account to continue" : "Verify your email to continue"}</h1>
        <p>For added security, enter the 6 digit code sent to<span className="verification-email">{email}</span></p>
      </header>
      <form className="otp-section" onSubmit={(event) => {
        event.preventDefault();
        void submitCode(digits.join(""));
      }}>
        {codeSent ? <Notice onDismiss={() => setCodeSent(false)}>New code sent</Notice> : null}
        <div aria-label="Six digit verification code" className="otp-row" role="group">
          {digits.map((digit, index) => (
            <input
              aria-label={`Digit ${index + 1}`}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? "otp-error" : undefined}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              disabled={loading || resending || restartRequired}
              inputMode="numeric"
              key={index}
              maxLength={index === 0 ? 6 : 1}
              onPaste={(event) => {
                const code = event.clipboardData.getData("text").replace(/\D/g, "");
                if (code.length !== 6) return;
                event.preventDefault();
                setDigits(code.split(""));
                setErrorMessage("");
                inputs.current[5]?.focus();
              }}
              onChange={(event) => updateDigit(event, index)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus();
              }}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
            />
          ))}
        </div>
        {errorMessage ? (
          <p className="field-error" id="otp-error" role="alert">
            <AlertIcon />
            <span className="field-error-text">{errorMessage}</span>
          </p>
        ) : null}
        <button className="primary-button otp-verify-button" disabled={!completeCode || !email || loading || resending || restartRequired} type="submit">
          {loading ? "Verifying..." : "Verify"}
        </button>
        <p className="resend-copy">
          Didn&apos;t receive a code?{" "}
          <button className="text-link accent" disabled={resending || loading || restartRequired || resendWait > 0} onClick={resendCode} type="button">
            {resending ? "Sending..." : resendWait > 0 ? `Resend code (${resendWait}s)` : "Resend code"}
          </button>
        </p>
        {purpose === "login" && restartRequired ? (
          <button className="text-link accent" disabled={loading || resending} onClick={() => goTo("login")} type="button">
            Back to sign in
          </button>
        ) : null}
      </form>
    </div>
  );
}

