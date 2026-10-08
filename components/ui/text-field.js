"use client";

import Image from "next/image";
import { useState } from "react";

function EyeIcon({ visible = false }) {
  return (
    <Image
      alt=""
      className="eye-icon"
      height={24}
      src={visible ? "/auth-icons/hide-password.svg" : "/auth-icons/view-password.svg"}
      width={24}
    />
  );
}

export function AlertIcon() {
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

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  helper,
  autoComplete,
  inputMode,
  showPasswordToggle = true,
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const canTogglePassword = isPassword && showPasswordToggle;
  const inputType = canTogglePassword && visible ? "text" : type;

  return (
    <label className={`field-block${error ? " field-block-error" : ""}`}>
      <span className="field-label">{label}</span>
      <span className={`input-wrap${error ? " has-error" : ""}${isPassword && !showPasswordToggle ? " no-trailing-action" : ""}`}>
        <input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={onChange}
          placeholder={placeholder}
          type={inputType}
          value={value}
        />
        {canTogglePassword ? (
          <button
            aria-label={visible ? "Hide password" : "Show password"}
            className="icon-button"
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            <EyeIcon visible={visible} />
          </button>
        ) : null}
      </span>
      {error ? (
        <span className="field-error" role="alert">
          <AlertIcon />
          <span className="field-error-text">{error}</span>
        </span>
      ) : null}
      {helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}
