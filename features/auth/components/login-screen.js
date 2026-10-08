"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TextField } from "../../../components/ui/text-field";
import { isValidEmail } from "../validation/email";

export default function LoginScreen({ email, setEmail, goTo, onSendVerification, forceError = false }) {
  const [showError, setShowError] = useState(forceError);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (forceError) setShowError(true);
  }, [forceError]);

  function continueWithEmail(event) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setShowError(true);
      setErrorMessage("Enter a valid email address");
      return;
    }
    setShowError(false);
    setErrorMessage("");
    goTo("password");
  }

  async function startRegistration(event) {
    event.preventDefault();
    if (busy.current) return;
    if (!isValidEmail(email)) {
      setShowError(true);
      setErrorMessage("Enter a valid email address");
      return;
    }

    busy.current = true;
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
      setErrorMessage(error.errors?.email ? "Enter a valid email address" : error.message || "We could not send a verification code.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="screen-content login-content">
      <header className="intro centered">
        <h1>Welcome Back <span aria-hidden="true">👋</span></h1>
        <p>Manage your entire business in one place</p>
      </header>

      <form className="login-form" noValidate onSubmit={continueWithEmail}>
        <div className="social-group">
          <button className="google-button" disabled={loading} onClick={() => goTo("google")} type="button">
            <Image alt="" height={20} src="/google-logo.svg" width={20} />
            <span>Continue with Google</span>
          </button>
          <span className="or-label">OR</span>
        </div>

        <div className="fields-group">
          <TextField
            autoComplete="email"
            error={showError ? errorMessage || "Enter a valid email address" : ""}
            inputMode="email"
            label="Email"
            onChange={(event) => {
              const nextEmail = event.target.value;
              setEmail(nextEmail);
              if (showError) {
                const valid = isValidEmail(nextEmail);
                setShowError(!valid);
                if (valid) setErrorMessage("");
              }
            }}
            placeholder="Enter your personal or work email"
            type="email"
            value={email}
          />
          <button className="primary-button" disabled={loading} type="submit">Continue with email</button>
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
