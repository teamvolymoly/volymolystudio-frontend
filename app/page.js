"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authApi } from "./lib/auth-api";
import { GoogleLinkScreen, GoogleErrorNotice } from "./components/google-auth";

const SCREEN_NAMES = new Set([
  "login",
  "google",
  "google-link",
  "email-error",
  "verify",
  "incorrect-code",
  "new-code-sent",
  "password",
  "incorrect-password",
  "account-exists-google",
  "google-account-not-found",
  "forgot-password",
  "link-sent",
  "recover-account",
  "recover-account-error",
  "reset-password",
  "password-too-short",
  "reset-success",
  "link-expired",
  "error"
]);

function useResendCooldown() {
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  function startCooldown(seconds) {
    const duration = Math.min(3600, Math.max(0, Math.ceil(Number(seconds) || 0)));
    deadline.current = Date.now() + duration * 1000;
    setRemaining(duration);
  }

  return [remaining, startCooldown];
}

function EyeIcon() {
  return (
    <Image
      alt=""
      className="eye-icon"
      height={24}
      src="/auth-icons/view-password.svg"
      width={24}
    />
  );
}

function AlertIcon() {
  return (
    <Image
      alt=""
      className="alert-icon"
      height={16}
      src="/auth-icons/alert-circle.svg"
      width={16}
    />
  );
}

const NOTICE_ICONS = {
  success: {
    status: "/auth-icons/check-circle.svg",
    close: "/auth-icons/close.svg",
  },
  error: {
    status: "/auth-icons/alert-error.svg",
    close: "/auth-icons/close-error.svg",
  },
  warning: {
    status: "/auth-icons/alert-warning.svg",
    close: "/auth-icons/close-warning.svg",
  },
};

function Footer() {
  return (
    <footer className="auth-footer">
      <p>Need help?</p>
      <p className="terms">
        By logging in, you agree to volymoly
        <br />
        <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>
      </p>
    </footer>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  helper,
  autoComplete
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <label className="field-block">
      <span className="field-label">{label}</span>
      <span className={`input-wrap${error ? " has-error" : ""}`}>
        <input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          onChange={onChange}
          placeholder={placeholder}
          type={inputType}
          value={value}
        />
        {isPassword ? (
          <button
            aria-label={visible ? "Hide password" : "Show password"}
            className="icon-button"
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            <EyeIcon />
          </button>
        ) : null}
      </span>
      {error ? (
        <span className="field-error" role="alert">
          <AlertIcon />
          {error}
        </span>
      ) : null}
      {helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}

function Notice({ children, tone = "success", onDismiss }) {
  const icons = NOTICE_ICONS[tone] || NOTICE_ICONS.success;

  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <div className="notice-content">
        <Image alt="" className="notice-icon" height={20} src={icons.status} width={20} />
        <span>{children}</span>
      </div>
      <button aria-label="Dismiss message" className="notice-close" onClick={onDismiss} type="button">
        <Image alt="" height={20} src={icons.close} width={20} />
      </button>
    </div>
  );
}

function EmailSummary({ email, onChangeEmail }) {
  return (
    <div className="email-summary">
      <span>{email}</span>
      <button className="text-link accent" onClick={onChangeEmail} type="button">
        Change Email
      </button>
    </div>
  );
}

function LoginHeader({ title = "Log in", subtitle = "Continue to volymoly", centered = true }) {
  return (
    <header className={`intro${centered ? " centered" : ""}`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function LoginScreen({ email, setEmail, goTo, onSendVerification, forceError = false }) {
  const [showError, setShowError] = useState(forceError);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forceError) setShowError(true);
  }, [forceError]);

  function continueWithEmail(event) {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setShowError(true);
      return;
    }
    goTo("password");
  }

  async function startRegistration(event) {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setShowError(true);
      setErrorMessage("Enter a valid email address");
      return;
    }

    setLoading(true);
    setShowError(false);
    setErrorMessage("");

    try {
      const result = await onSendVerification(email, "registration");
      goTo("verify", {
        verification: {
          email,
          purpose: "registration",
          requestId: result.request_id,
        },
      });
    } catch (error) {
      setShowError(true);
      setErrorMessage(error.message || "We could not send a verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-content login-content">
      <header className="intro centered">
        <h1>Welcome Back <span aria-hidden="true">👋</span></h1>
        <p>Manage your entire business in one place</p>
      </header>

      <form className="login-form" onSubmit={continueWithEmail}>
        <div className="social-group">
          <button className="google-button" onClick={() => authApi.startGoogleLogin()} type="button">
            <Image alt="" height={20} src="/google-logo.svg" width={20} />
            <span>Continue with Google</span>
          </button>
          <span className="or-label">OR</span>
        </div>

        <div className="fields-group">
          <TextField
            autoComplete="email"
            error={showError ? errorMessage || "Enter a valid email address" : ""}
            label="Email"
            onChange={(event) => {
              setEmail(event.target.value);
              setShowError(false);
            }}
            placeholder="Enter your personal or work email"
            value={email}
          />
          <button className="primary-button" type="submit">Continue with email</button>
          <p className="signup-copy">
            New to volymoly?{" "}
            <button className="text-link accent" disabled={loading} onClick={startRegistration} type="button">
              Get Started
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

function GoogleScreen() {
  return (
    <div className="screen-content message-screen google-screen">
      <h1>Redirecting to Google</h1>
      <p>This will only take a moment......</p>
    </div>
  );
}

function VerifyScreen({
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
        {errorMessage ? <p className="field-error" id="otp-error" role="alert"><AlertIcon />{errorMessage}</p> : null}
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

function PasswordScreen({ email, goTo, onLogin, invalid = false, notice }) {
  const [password, setPassword] = useState("");
  const [showRequired, setShowRequired] = useState(false);
  const [showNotice, setShowNotice] = useState(Boolean(notice));
  const [errorMessage, setErrorMessage] = useState(invalid ? "Incorrect Password" : "");
  const [loading, setLoading] = useState(false);

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
            if (!password.trim()) {
              setShowRequired(true);
              return;
            }
            if (!email) {
              goTo("login");
              return;
            }

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
              setErrorMessage(error.message || "Incorrect Password");
            } finally {
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

function ForgotPasswordScreen({ email, goTo, onForgotPassword, state }) {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
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

function RecoverAccountScreen({ goTo, onStartRecovery, forceError = false }) {
  const [newEmail, setNewEmail] = useState("");
  const [showError, setShowError] = useState(forceError);
  const [errorMessage, setErrorMessage] = useState(
    forceError ? "This email is already associated with another account" : ""
  );
  const [loading, setLoading] = useState(false);

  return (
    <div className="screen-content recover-screen">
      <LoginHeader
        subtitle={<>Add a new email to continue recovering your<br />account on volymoly</>}
        title="Recover your account"
      />
      <form
        className="stacked-form recover-form"
        onSubmit={(event) => {
          event.preventDefault();
          const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
          if (!valid) {
            setShowError(true);
            setErrorMessage("Enter a valid email address");
            return;
          }
          if (forceError) {
            setShowError(true);
            setErrorMessage("This email is already associated with another account");
            return;
          }

          setLoading(true);
          setShowError(false);
          setErrorMessage("");

          onStartRecovery(newEmail)
            .then((result) => {
              goTo("verify", {
                verification: {
                  email: newEmail,
                  purpose: "account_recovery",
                  requestId: result.request_id,
                },
              });
            })
            .catch((error) => {
              setShowError(true);
              setErrorMessage(error.errors?.new_email?.[0] || error.message || "We could not start account recovery.");
            })
            .finally(() => setLoading(false));
        }}
      >
        <TextField
          autoComplete="email"
          error={showError ? errorMessage || "Enter a valid email address" : ""}
          label="New Email"
          onChange={(event) => {
            setNewEmail(event.target.value);
            setShowError(false);
            setErrorMessage("");
          }}
          placeholder="Enter your new email"
          value={newEmail}
        />
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Sending..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

function ResetPasswordScreen({ email, token, goTo, onResetPassword, showError = false }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const resetEmail = email;

  return (
    <div className="screen-content reset-screen">
      <header className="intro centered">
        <h1>Reset account password</h1>
        <p>For the account {resetEmail}</p>
      </header>
      <form
        className="stacked-form reset-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (password.length < 8) {
            goTo("password-too-short", { resetEmail, resetToken: token });
            return;
          }

          if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match");
            return;
          }

          if (!token || !resetEmail) {
            goTo("link-expired", { email: resetEmail, resetToken: "" });
            return;
          }

          setLoading(true);
          setErrorMessage("");

          onResetPassword({
            email: resetEmail,
            token,
            password,
            passwordConfirmation: confirmPassword,
          })
            .then(() => goTo("reset-success", { email: resetEmail }))
            .catch((error) => {
              const passwordError = error.errors?.password?.[0];
              if (error.status === 422 && error.errors?.token) {
                goTo("link-expired", { email: resetEmail, resetToken: "" });
                return;
              }
              setErrorMessage(passwordError || error.message || "We could not reset your password.");
            })
            .finally(() => setLoading(false));
        }}
      >
        <TextField
          autoComplete="new-password"
          error={errorMessage || (showError ? "Password is too short (minimum is 8 characters)" : "")}
          helper="Your password must be at least 8 characters, and can’t begin or end with a space."
          label="New password"
          onChange={(event) => {
            setPassword(event.target.value);
            setErrorMessage("");
          }}
          placeholder="Enter your new password"
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          label="Confirm new password"
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrorMessage("");
          }}
          placeholder="Enter your personal or work email"
          type="password"
          value={confirmPassword}
        />
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Saving..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div className="screen-content message-screen error-screen">
      <h1>We couldn&apos;t verify this<br />request right now.</h1>
      <p>If you haven&apos;t seen this error before, refresh the<br />page you were on and try again.</p>
    </div>
  );
}

function Screen({
  screen,
  email,
  setEmail,
  goTo,
  verification,
  resetEmail,
  resetToken,
  onSendVerification,
  onVerifyCode,
  onLogin,
  onForgotPassword,
  onStartRecovery,
  onResetPassword,
}) {
  switch (screen) {
    case "google":
      return <GoogleScreen />;
    case "google-link":
      return <GoogleLinkScreen onCancel={() => goTo("login")} />;
    case "email-error":
      return <LoginScreen email={email} forceError goTo={goTo} onSendVerification={onSendVerification} setEmail={setEmail} />;
    case "verify":
      return (
        <VerifyScreen
          email={verification.email || email}
          goTo={goTo}
          onSendVerification={onSendVerification}
          onVerifyCode={onVerifyCode}
          purpose={verification.purpose}
          requestId={verification.requestId}
        />
      );
    case "incorrect-code":
      return (
        <VerifyScreen
          email={verification.email || email}
          goTo={goTo}
          initialError="Incorrect code"
          onSendVerification={onSendVerification}
          onVerifyCode={onVerifyCode}
          purpose={verification.purpose}
          requestId={verification.requestId}
        />
      );
    case "new-code-sent":
      return (
        <VerifyScreen
          email={verification.email || email}
          goTo={goTo}
          initialCodeSent
          onSendVerification={onSendVerification}
          onVerifyCode={onVerifyCode}
          purpose={verification.purpose}
          requestId={verification.requestId}
        />
      );
    case "password":
      return <PasswordScreen email={email} goTo={goTo} onLogin={onLogin} />;
    case "incorrect-password":
      return <PasswordScreen email={email} goTo={goTo} invalid onLogin={onLogin} />;
    case "account-exists-google":
      return <PasswordScreen email={email} goTo={goTo} onLogin={onLogin} notice={{ message: "An account with this email already exists, and is not connected to Google.", tone: "warning" }} />;
    case "google-account-not-found":
      return <PasswordScreen email={email} goTo={goTo} onLogin={onLogin} notice={{ message: "we couldn’t find a volymoly account connected to your google account.", tone: "error" }} />;
    case "forgot-password":
      return <ForgotPasswordScreen email={email} goTo={goTo} onForgotPassword={onForgotPassword} />;
    case "link-sent":
      return <PasswordScreen email={email} goTo={goTo} onLogin={onLogin} notice={{ message: "A link to reset your password has been emailed to you.", tone: "success" }} />;
    case "recover-account":
      return <RecoverAccountScreen goTo={goTo} onStartRecovery={onStartRecovery} />;
    case "recover-account-error":
      return <RecoverAccountScreen forceError goTo={goTo} onStartRecovery={onStartRecovery} />;
    case "reset-password":
      return <ResetPasswordScreen email={resetEmail || email} goTo={goTo} onResetPassword={onResetPassword} token={resetToken} />;
    case "password-too-short":
      return <ResetPasswordScreen email={resetEmail || email} goTo={goTo} onResetPassword={onResetPassword} showError token={resetToken} />;
    case "reset-success":
      return <PasswordScreen email={email} goTo={goTo} onLogin={onLogin} notice={{ message: "Your password was reset. You can log in using your new password.", tone: "success" }} />;
    case "link-expired":
      return <ForgotPasswordScreen email={email} goTo={goTo} onForgotPassword={onForgotPassword} state="expired" />;
    case "error":
      return <ErrorScreen />;
    default:
      return <LoginScreen email={email} goTo={goTo} onSendVerification={onSendVerification} setEmail={setEmail} />;
  }
}

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [verification, setVerification] = useState({
    email: "",
    purpose: "registration",
    requestId: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("screen");
    const queryEmail = params.get("email") || "";
    const queryToken = params.get("token") || "";

    if (SCREEN_NAMES.has(requested)) setScreen(requested);
    if (queryEmail) {
      setEmail(queryEmail);
      setResetEmail(queryEmail);
    }
    if (queryToken) setResetToken(queryToken);
    if (["verify", "incorrect-code", "new-code-sent"].includes(requested)) {
      setVerification({
        email: queryEmail,
        purpose: params.get("purpose") || "registration",
        requestId: params.get("request_id") || "",
      });
    }
  }, []);

  function goTo(nextScreen, options = {}) {
    const nextEmail = Object.prototype.hasOwnProperty.call(options, "email") ? options.email : email;
    const nextVerification = options.verification || verification;
    const nextResetEmail = Object.prototype.hasOwnProperty.call(options, "resetEmail")
      ? options.resetEmail
      : options.email || resetEmail;
    const nextResetToken = Object.prototype.hasOwnProperty.call(options, "resetToken")
      ? options.resetToken
      : resetToken;

    setScreen(nextScreen);
    if (Object.prototype.hasOwnProperty.call(options, "email")) setEmail(options.email);
    if (options.verification) setVerification(options.verification);
    if (Object.prototype.hasOwnProperty.call(options, "resetEmail")) setResetEmail(options.resetEmail);
    if (Object.prototype.hasOwnProperty.call(options, "resetToken")) setResetToken(options.resetToken);

    if (nextScreen === "login") {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const params = new URLSearchParams({ screen: nextScreen });
    if (["password", "incorrect-password", "forgot-password", "link-sent", "reset-success", "link-expired"].includes(nextScreen) && nextEmail) {
      params.set("email", nextEmail);
    }
    if (nextScreen === "verify" && nextVerification.email) {
      params.set("email", nextVerification.email);
      params.set("purpose", nextVerification.purpose || "registration");
      if (nextVerification.requestId) params.set("request_id", nextVerification.requestId);
    }
    if (["reset-password", "password-too-short"].includes(nextScreen) && nextResetEmail) {
      params.set("email", nextResetEmail);
      if (nextResetToken) params.set("token", nextResetToken);
    }

    const url = `?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }

  function sendVerificationCode(targetEmail, purpose, requestId) {
    return purpose === "login"
      ? authApi.resendLoginCode()
      : authApi.sendVerificationCode(targetEmail, purpose, requestId);
  }

  function verifyCode(targetEmail, code, purpose, requestId) {
    return purpose === "login"
      ? authApi.verifyLoginCode(code)
      : authApi.verifyCode(targetEmail, code, purpose, requestId);
  }

  function login(targetEmail, password) {
    return authApi.login(targetEmail, password);
  }

  function forgotPassword(targetEmail) {
    return authApi.forgotPassword(targetEmail);
  }

  function startRecovery(newEmail) {
    return authApi.recoverAccount({ newEmail, accountEmail: email });
  }

  function resetPassword(payload) {
    return authApi.resetPassword(payload);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="panel-content">
          <Image alt="Volymoly" className="brand-logo" height={46} priority src="/logo.svg" width={158} />
          <GoogleErrorNotice />
          <Screen
            email={email}
            goTo={goTo}
            onForgotPassword={forgotPassword}
            onLogin={login}
            onResetPassword={resetPassword}
            onSendVerification={sendVerificationCode}
            onStartRecovery={startRecovery}
            onVerifyCode={verifyCode}
            resetEmail={resetEmail}
            resetToken={resetToken}
            screen={screen}
            setEmail={setEmail}
            verification={verification}
          />
          <Footer />
        </div>
      </section>
      <aside aria-label="Volymoly digital dashboard illustration" className="hero-panel">
        <Image alt="Digital dashboard in a sunlit valley" fill priority sizes="(max-width: 900px) 0px, 64vw" src="/hero.png" />
      </aside>
    </main>
  );
}
