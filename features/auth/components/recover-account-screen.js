"use client";

import { useRef, useState } from "react";
import { TextField } from "../../../components/ui/text-field";
import { isValidEmail } from "../validation/email";
import { LoginHeader } from "./auth-layout";

export default function RecoverAccountScreen({ goTo, onStartRecovery, forceError = false }) {
  const [newEmail, setNewEmail] = useState("");
  const [showError, setShowError] = useState(forceError);
  const [errorMessage, setErrorMessage] = useState(
    forceError ? "This email is already associated with another account" : ""
  );
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

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
          if (busy.current) return;
          const valid = isValidEmail(newEmail);
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

          busy.current = true;
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
            .finally(() => {
              busy.current = false;
              setLoading(false);
            });
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
