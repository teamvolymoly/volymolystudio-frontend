"use client";

import { useEffect, useRef, useState } from "react";

export function useResendCooldown() {
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
