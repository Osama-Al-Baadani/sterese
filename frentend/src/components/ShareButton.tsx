"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Share2 } from "lucide-react";

export default function ShareButton({ title }: { title: string }) {
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — nothing more we can do here
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={tCommon("shareProduct")}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-400 transition hover:text-brand-600"
    >
      {copied ? <Check className="h-5 w-5 text-brand-600" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
    </button>
  );
}
