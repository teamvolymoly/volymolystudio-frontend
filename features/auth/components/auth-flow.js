"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SCREEN_NAMES } from "../constants/screens";
import { authApi } from "../services/auth-api";
import { Footer } from "./auth-layout";
import AuthScreen from "./auth-screen-router";
import { GoogleErrorNotice } from "./google-error-notice";

export default function AuthFlow() {
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
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const requested = params.get("screen");
    const queryEmail = params.get("email") || "";
    const queryToken = params.get("token") || fragment.get("token") || "";

    if (SCREEN_NAMES.has(requested)) setScreen(requested);
    if (queryEmail) {
      setEmail(queryEmail);
      setResetEmail(queryEmail);
    }
    if (queryToken) setResetToken(queryToken);
    if (params.has("token")) {
      params.delete("token");
      const cleanQuery = params.toString();
      const cleanUrl = window.location.pathname
        + (cleanQuery ? "?" + cleanQuery : "")
        + "#"
        + new URLSearchParams({ token: queryToken }).toString();
      window.history.replaceState({}, "", cleanUrl);
    }
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
    }

    const url = "?" + params.toString();
    const fragment = ["reset-password", "password-too-short"].includes(nextScreen) && nextResetToken
      ? "#" + new URLSearchParams({ token: nextResetToken }).toString()
      : "";
    window.history.replaceState({}, "", url + fragment);
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
          <AuthScreen
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
