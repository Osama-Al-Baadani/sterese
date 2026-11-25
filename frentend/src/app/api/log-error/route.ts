import { NextRequest, NextResponse } from "next/server";

// Client-side errors have nowhere to land on their own — the browser tab
// that hit them is the only place they'd ever show up. This gives the
// error boundaries and the global window.onerror/unhandledrejection
// listener somewhere to report to, so they end up in the same PM2 error
// log as server-side crashes (console.error on the server is captured by
// PM2 into storeseco-web-error.log) instead of vanishing with the tab.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.error(
      "[client-error]",
      JSON.stringify({
        message: body.message,
        stack: body.stack,
        url: body.url,
        userAgent: req.headers.get("user-agent"),
        time: new Date().toISOString(),
      }),
    );
  } catch {
    // malformed payload — nothing useful to log
  }
  return NextResponse.json({ ok: true });
}
