"use client";

import Image from "next/image";

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

export function Notice({ children, tone = "success", onDismiss }) {
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
