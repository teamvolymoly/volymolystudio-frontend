"use client";

import ErrorScreen from "./error-screen";
import ForgotPasswordScreen from "./forgot-password-screen";
import GoogleLinkScreen from "./google-link-screen";
import GoogleScreen from "./google-redirect-screen";
import LoginScreen from "./login-screen";
import PasswordScreen from "./password-screen";
import RecoverAccountScreen from "./recover-account-screen";
import ResetPasswordScreen from "./reset-password-screen";
import VerifyScreen from "./verify-screen";

export default function AuthScreen({
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
      return <GoogleLinkScreen fallbackEmail={email} goTo={goTo} />;
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
      return <GoogleLinkScreen fallbackEmail={email} goTo={goTo} />;
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
