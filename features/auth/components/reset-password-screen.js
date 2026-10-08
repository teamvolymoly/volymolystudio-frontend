"use client";

import { useRef, useState } from "react";
import { TextField } from "../../../components/ui/text-field";

export default function ResetPasswordScreen({ email, token, goTo, onResetPassword, showError = false }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    showError ? "Password is too short (minimum is 8 characters)" : "",
  );
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
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
          if (busy.current) return;
          if (password.length < 8) {
            setErrorMessage("Password is too short (minimum is 8 characters)");
            setConfirmError("");
            return;
          }

          if (password.trim() !== password) {
            setErrorMessage("The password cannot begin or end with a space.");
            setConfirmError("");
            return;
          }

          if (password !== confirmPassword) {
            setErrorMessage("");
            setConfirmError("Passwords do not match");
            return;
          }

          if (!token || !resetEmail) {
            goTo("link-expired", { email: resetEmail, resetToken: "" });
            return;
          }

          busy.current = true;
          setLoading(true);
          setErrorMessage("");
          setConfirmError("");

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
            .finally(() => {
              busy.current = false;
              setLoading(false);
            });
        }}
      >
        <TextField
          autoComplete="new-password"
          error={errorMessage}
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
          error={confirmError}
          label="Confirm new password"
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setConfirmError("");
          }}
          placeholder="Confirm your new password"
          showPasswordToggle={false}
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
