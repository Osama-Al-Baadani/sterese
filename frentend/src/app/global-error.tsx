"use client";

import { useEffect } from "react";

// Only fires when an error escapes even the locale layout's own boundary —
// this replaces the whole document, so unlike error.tsx it can't rely on
// anything from the layout above it (fonts, providers, next-intl) and has
// to render a full, self-contained <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, url: window.location.href }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#fff", color: "#1a2742" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>صار خطأ غير متوقع</h1>
          <p style={{ maxWidth: 360, color: "#4e6080" }}>جرّب تحدّث الصفحة، وإذا استمرت المشكلة تواصل معنا.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: 999,
              background: "#f0b21f",
              color: "#1a2742",
              fontWeight: 700,
              padding: "10px 24px",
              border: "none",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
