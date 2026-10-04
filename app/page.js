"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEFAULT_LOGIN_EMAIL = "thatswhatshecoded@gmail.com";
const RESET_EMAIL = "teamvolymoly@gmail.com";

const SCREEN_NAMES = new Set([
  "login",
  "google",
  "email-error",
  "verify",
  "password",
  "incorrect-password",
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

function EyeIcon({ open = false }) {
  return (
    <svg aria-hidden="true" className="eye-icon" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
      {open ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="alert-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5v4M8 11.25v.25" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="notice-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.25" />
      <path d="m4.75 8.1 2.05 2.05 4.45-4.45" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

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
            <EyeIcon open={visible} />
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
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {tone === "success" ? <CheckIcon /> : <AlertIcon />}
      <span>{children}</span>
      <button aria-label="Dismiss message" className="notice-close" onClick={onDismiss} type="button">
        <CloseIcon />
      </button>
    </div>
  );
}

function EmailSummary({ email, onChangeEmail }) {
  return (
    <div className="email-summary">
      <span>{email || DEFAULT_LOGIN_EMAIL}</span>
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

function LoginScreen({ email, setEmail, goTo, forceError = false }) {
  const [showError, setShowError] = useState(forceError);

  function continueWithEmail(event) {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setShowError(true);
      return;
    }
    goTo("password");
  }

  return (
    <div className="screen-content login-content">
      <header className="intro centered">
        <h1>Welcome Back <span aria-hidden="true">👋</span></h1>
        <p>Manage your entire business in one place</p>
      </header>

      <form className="login-form" onSubmit={continueWithEmail}>
        <div className="social-group">
          <button className="google-button" onClick={() => goTo("google")} type="button">
            <Image alt="" height={20} src="/google-logo.svg" width={20} />
            <span>Continue with Google</span>
          </button>
          <span className="or-label">OR</span>
        </div>

        <div className="fields-group">
          <TextField
            autoComplete="email"
            error={showError ? "Enter a valid email address" : ""}
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
            <button className="text-link accent" onClick={() => goTo("verify")} type="button">
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

function VerifyScreen({ goTo }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  useEffect(() => {
    if (digits.every(Boolean)) goTo("password");
  }, [digits, goTo]);

  function updateDigit(event, index) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const nextDigits = [...current];
      nextDigits[index] = digit;
      return nextDigits;
    });

    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  return (
    <div className="screen-content verify-screen">
      <header className="intro centered">
        <h1>Verify your account to<br />continue</h1>
        <p>For added security, enter the 6 digit code sent to<br />ajaygupta@gmail.com.</p>
      </header>
      <div className="otp-section">
        <div aria-label="Six digit verification code" className="otp-row">
          {digits.map((digit, index) => (
            <input
              aria-label={`Digit ${index + 1}`}
              inputMode="numeric"
              key={index}
              maxLength={1}
              onChange={(event) => updateDigit(event, index)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus();
              }}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
            />
          ))}
        </div>
        <p className="resend-copy">
          Didn&apos;t receive a code?{" "}
          <button className="text-link accent" type="button">Resend code</button>
        </p>
      </div>
    </div>
  );
}

function PasswordScreen({ email, goTo, invalid = false, notice }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showRequired, setShowRequired] = useState(false);
  const [showNotice, setShowNotice] = useState(Boolean(notice));

  return (
    <div className={`screen-content password-screen${notice ? " with-notice" : ""}`}>
      <LoginHeader />
      <div className="password-body">
        {showNotice ? (
          <Notice onDismiss={() => setShowNotice(false)} tone={notice.tone}>{notice.message}</Notice>
        ) : null}
        <form
          className="stacked-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!password.trim()) {
              setShowRequired(true);
              return;
            }
            router.push("/dashboard");
          }}
        >
          <EmailSummary email={email} onChangeEmail={() => goTo("login")} />
          <TextField
            autoComplete="current-password"
            error={invalid ? "Incorrect Password" : showRequired ? "Enter your password" : ""}
            label="Password"
            onChange={(event) => {
              setPassword(event.target.value);
              setShowRequired(false);
            }}
            placeholder="Enter your password"
            type="password"
            value={password}
          />
          <button className="forgot-link" onClick={() => goTo("forgot-password")} type="button">
            Forgot password?
          </button>
          <button className="primary-button" type="submit">Log in</button>
        </form>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ email, goTo }) {
  return (
    <div className="screen-content password-screen forgot-screen">
      <LoginHeader />
      <div className="password-body">
        <form
          className="stacked-form"
          onSubmit={(event) => {
            event.preventDefault();
            goTo("link-sent");
          }}
        >
          <EmailSummary email={email} onChangeEmail={() => goTo("login")} />
          <button className="primary-button" type="submit">Email password reset</button>
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

function RecoverAccountScreen({ goTo, forceError = false }) {
  const [newEmail, setNewEmail] = useState("");
  const [showError, setShowError] = useState(forceError);

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
          if (!valid || forceError) {
            setShowError(true);
            return;
          }
          goTo("verify");
        }}
      >
        <TextField
          autoComplete="email"
          error={showError ? "This email is already associated with another account" : ""}
          label="New Email"
          onChange={(event) => {
            setNewEmail(event.target.value);
            setShowError(false);
          }}
          placeholder="Enter your new email"
          value={newEmail}
        />
        <button className="primary-button" type="submit">Continue with email</button>
        <p className="signup-copy">
          New to volymoly?{" "}
          <button className="text-link accent" onClick={() => goTo("verify")} type="button">Get Started</button>
        </p>
      </form>
    </div>
  );
}

function ResetPasswordScreen({ goTo, showError = false }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="screen-content reset-screen">
      <header className="intro centered">
        <h1>Reset account password</h1>
        <p>For the account {RESET_EMAIL}</p>
      </header>
      <form
        className="stacked-form reset-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (password.length < 8) goTo("password-too-short");
          else if (password !== confirmPassword) goTo("error");
          else goTo("reset-success");
        }}
      >
        <TextField
          autoComplete="new-password"
          error={showError ? "Password is too short (minimum is 8 characters)" : ""}
          helper="Your password must be at least 8 characters, and can’t begin or end with a space."
          label="New password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your new password"
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          label="Confirm new password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your personal or work email"
          type="password"
          value={confirmPassword}
        />
        <button className="primary-button" type="submit">Log in</button>
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

function Screen({ screen, email, setEmail, goTo }) {
  switch (screen) {
    case "google":
      return <GoogleScreen />;
    case "email-error":
      return <LoginScreen email={email} forceError goTo={goTo} setEmail={setEmail} />;
    case "verify":
      return <VerifyScreen goTo={goTo} />;
    case "password":
      return <PasswordScreen email={email} goTo={goTo} />;
    case "incorrect-password":
      return <PasswordScreen email={email} goTo={goTo} invalid />;
    case "forgot-password":
      return <ForgotPasswordScreen email={email} goTo={goTo} />;
    case "link-sent":
      return <PasswordScreen email={email} goTo={goTo} notice={{ message: "A link to reset your password has been emailed to you.", tone: "success" }} />;
    case "recover-account":
      return <RecoverAccountScreen goTo={goTo} />;
    case "recover-account-error":
      return <RecoverAccountScreen forceError goTo={goTo} />;
    case "reset-password":
      return <ResetPasswordScreen goTo={goTo} />;
    case "password-too-short":
      return <ResetPasswordScreen goTo={goTo} showError />;
    case "reset-success":
      return <PasswordScreen email={email} goTo={goTo} notice={{ message: "Your password was reset. You can log in using your new password.", tone: "success" }} />;
    case "link-expired":
      return <PasswordScreen email={email} goTo={goTo} notice={{ message: "Link expired. Enter your email below to receive a new reset link.", tone: "error" }} />;
    case "error":
      return <ErrorScreen />;
    default:
      return <LoginScreen email={email} goTo={goTo} setEmail={setEmail} />;
  }
}

export default function Home() {
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("screen");
    if (SCREEN_NAMES.has(requested)) setScreen(requested);
  }, []);

  function goTo(nextScreen) {
    setScreen(nextScreen);
    const url = nextScreen === "login" ? window.location.pathname : `?screen=${nextScreen}`;
    window.history.replaceState({}, "", url);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="panel-content">
          <Image alt="Volymoly" className="brand-logo" height={46} priority src="/logo.svg" width={158} />
          <Screen email={email} goTo={goTo} screen={screen} setEmail={setEmail} />
          <Footer />
        </div>
      </section>
      <aside aria-label="Volymoly digital dashboard illustration" className="hero-panel">
        <Image alt="Digital dashboard in a sunlit valley" fill priority sizes="(max-width: 900px) 0px, 64vw" src="/hero.png" />
      </aside>
    </main>
  );
}
