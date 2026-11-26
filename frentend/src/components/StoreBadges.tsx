import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

// One button instead of separate App Store / Google Play ones — "/app" is a
// middleware redirect (src/middleware.ts) that sends iPhones to the App
// Store and everything else to Google Play, so the visitor never has to
// pick. Same link doubles as the download banner's QR code target.
export default function StoreBadges({ variant = "light" }: { variant?: "light" | "dark" }) {
  const tFooter = useTranslations("footer");
  const shell =
    variant === "light"
      ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
      : "border-navy-900/10 bg-navy-900 text-white hover:bg-navy-700";

  return (
    <a
      href="/app"
      target="_blank"
      rel="noreferrer"
      className={`flex w-fit items-center gap-2.5 rounded-xl border px-5 py-3 transition ${shell}`}
    >
      <Download className="h-6 w-6" aria-hidden />
      <span className="text-sm font-bold">{tFooter("downloadApp")}</span>
    </a>
  );
}
