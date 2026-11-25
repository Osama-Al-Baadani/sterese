"use client";

import { useEffect } from "react";

function report(message: string, stack?: string) {
  fetch("/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, url: window.location.href }),
    keepalive: true,
  }).catch(() => {
    // logging endpoint itself is unreachable — nothing more to do
  });
}

// React's own error boundaries (error.tsx / global-error.tsx) only catch
// render errors. Anything thrown from an event handler, a timeout, or a
// rejected promise never reaches them and would otherwise only ever show
// up in that one customer's browser console — this catches those too.
export default function ErrorLogger() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      report(e.message, e.error?.stack);
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      report(
        reason instanceof Error ? reason.message : String(reason),
        reason instanceof Error ? reason.stack : undefined,
      );
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
