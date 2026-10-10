"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authApi } from "../../auth/services/auth-api";
import styles from "./login-activity-review.module.css";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function readAndProtectToken() {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const queryToken = url.searchParams.get("token") || "";
  const token = queryToken || fragment.get("token") || "";

  if (url.searchParams.has("token")) {
    url.searchParams.delete("token");
    const query = url.searchParams.toString();
    const hash = TOKEN_PATTERN.test(token)
      ? "#" + new URLSearchParams({ token }).toString()
      : "";
    window.history.replaceState({}, "", url.pathname + (query ? "?" + query : "") + hash);
  }

  return TOKEN_PATTERN.test(token) ? token : "";
}

function formatSignedInAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ActivityDetails({ activity }) {
  const details = [
    ["Account", activity.email],
    ["Device", activity.device],
    ["Location", activity.location],
    ["IP address", activity.ip_address],
    ["Signed in", formatSignedInAt(activity.signed_in_at)],
  ];

  return (
    <dl className={styles.details}>
      {details.map(([label, value]) => (
        <div className={styles.detailRow} key={label}>
          <dt>{label}</dt>
          <dd>{value || "Unavailable"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function LoginActivityReview() {
  const token = useRef("");
  const [activity, setActivity] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    token.current = readAndProtectToken();

    if (!token.current) {
      setMessage("This activity link is invalid or expired.");
      setStatus("error");
      return () => {
        active = false;
      };
    }

    authApi.loginActivity(token.current)
      .then((result) => {
        if (!active) return;
        setActivity(result.activity);
        setStatus(result.activity?.secured ? "secured" : "ready");
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error.message || "We could not load this sign-in activity.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  async function secureAccount() {
    if (!token.current || status !== "ready") return;

    setStatus("securing");
    setMessage("");
    try {
      const result = await authApi.secureLoginActivity(token.current);
      setActivity((current) => current ? { ...current, secured: true } : current);
      setMessage(result.message || "Your account has been secured.");
      setStatus("secured");
    } catch (error) {
      setMessage(error.message || "We could not secure your account. Please try again.");
      setStatus(error.status === 410 ? "error" : "ready");
    }
  }

  const resetHref = activity?.email
    ? "/?" + new URLSearchParams({ screen: "forgot-password", email: activity.email }).toString()
    : "/?screen=forgot-password";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link aria-label="Volymoly login" href="/">
            <Image alt="Volymoly" height={46} priority src="/logo.svg" width={158} />
          </Link>
          <span className={styles.securityLabel}>Account security</span>
        </header>

        <section aria-live="polite" className={styles.card}>
          {status === "loading" ? (
            <div className={styles.centeredState} role="status">
              <span aria-hidden="true" className={styles.spinner} />
              <h1>Checking this activity</h1>
              <p>We&apos;re securely loading the sign-in details.</p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.centeredState}>
              <span aria-hidden="true" className={styles.errorIcon}>!</span>
              <p className={styles.eyebrow}>Link unavailable</p>
              <h1>We couldn&apos;t open this activity</h1>
              <p>{message}</p>
              <Link className={styles.secondaryButton} href="/">Return to login</Link>
            </div>
          ) : null}

          {status === "secured" ? (
            <div className={styles.centeredState}>
              <span aria-hidden="true" className={styles.successIcon}>✓</span>
              <p className={styles.eyebrow}>Account secured</p>
              <h1>All sessions have been signed out</h1>
              <p>{message || "This alert was already secured. Remembered devices must now be recognized again."}</p>
              <div className={styles.successActions}>
                <Link className={styles.primaryButton} href={resetHref}>Reset password</Link>
                <Link className={styles.textLink} href="/">Return to login</Link>
              </div>
            </div>
          ) : null}

          {status === "ready" || status === "securing" ? (
            <>
              <p className={styles.eyebrow}>New device sign-in</p>
              <h1 className={styles.title}>Do you recognize this activity?</h1>
              <p className={styles.subtitle}>
                Review the details below. If this wasn&apos;t you, secure your account immediately.
              </p>

              <ActivityDetails activity={activity} />

              {message ? <p className={styles.inlineError} role="alert">{message}</p> : null}

              <div className={styles.actionPanel}>
                <div>
                  <h2>This wasn&apos;t me</h2>
                  <p>Sign out every session, revoke API access, and require all browsers to be recognized again.</p>
                </div>
                <button
                  className={styles.dangerButton}
                  disabled={status === "securing"}
                  onClick={secureAccount}
                  type="button"
                >
                  {status === "securing" ? "Securing account..." : "Secure my account"}
                </button>
              </div>

              <p className={styles.wasMe}>
                Recognize this sign-in? <Link href="/">No action is needed</Link>
              </p>
            </>
          ) : null}
        </section>

        <footer className={styles.footer}>
          Security links expire after 24 hours. Volymoly will never ask for your password on this page.
        </footer>
      </div>
    </main>
  );
}
