"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock, Phone, User } from "lucide-react";
import { useTranslations } from "next-intl"; // Client translations hook for auth labels
import { useRouter } from "@/i18n/navigation"; // Locale-aware router so redirects preserve /en
import { useAuth } from "@/lib/auth-context";

type Step = "phone" | "otp" | "name";

export default function LoginForm() {
  const t = useTranslations("auth"); // Auth namespace translations
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sanitize redirect target to an internal path and strip any existing locale prefix to avoid /en/en/...
  const rawRedirect = searchParams.get("redirect") || "/account";
  const safePath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/account";
  const redirectTo = safePath.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  const { sendOtp, verifyOtp, setProfileName } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("otpSendFailed")); // Localized fallback error
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { isNew } = await verifyOtp(phone.trim(), code.trim());
      if (isNew) {
        setStep("name");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("otpInvalid")); // Localized fallback error
    } finally {
      setLoading(false);
    }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("nameRequired")); // Localized validation error
      return;
    }
    setLoading(true);
    await setProfileName(name.trim());
    router.push(redirectTo);
  }

  return (
    <div className="mx-auto max-w-sm">
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      {step === "phone" && (
        <form onSubmit={submitPhone} className="space-y-4">
          <div>
            {/* Localized phone label, RTL/LTR text alignment, and submit button */}
            <label className="mb-1.5 block text-sm font-bold text-navy-900">{t("phoneLabel")}</label>
            <div className="relative">
              {/* Icon on the left, not the right — the field itself is
                  dir="ltr" (a phone number reads left-to-right), so its
                  content grows away from the left edge, not toward it. An
                  icon pinned to the right instead sits in the digits' path
                  and gets crowded by them. */}
              <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-navy-300" aria-hidden />
              {/* Align phone text to the reading edge per locale while keeping dir="ltr" for digits */}
              <input
                required
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="input pl-11 rtl:text-right ltr:text-left"
              />
            </div>
          </div>
          <SubmitButton loading={loading} label={t("sendOtp")} />
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={submitOtp} className="space-y-4">
          {/* Localized OTP step prompt, label, confirm button, and change-phone action */}
          <p className="text-sm text-navy-500">{t("otpSentTo", { phone })}</p>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-navy-900">{t("otpLabel")}</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-navy-300" aria-hidden />
              <input
                required
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="input pl-11 text-center text-xl font-bold tracking-[0.5em]"
              />
            </div>
          </div>
          <SubmitButton loading={loading} label={t("confirm")} />
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-center text-xs font-semibold text-navy-500 hover:text-navy-700"
          >
            {t("changePhone")}
          </button>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={submitName} className="space-y-4">
          {/* Localized name step with logical start-3.5 / ps-11 spacing for RTL and LTR */}
          <p className="text-sm text-navy-500">{t("welcomeNamePrompt")}</p>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-navy-900">{t("fullName")}</label>
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 start-3.5 h-4.5 w-4.5 -translate-y-1/2 text-navy-300" aria-hidden />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                className="input ps-11"
              />
            </div>
          </div>
          <SubmitButton loading={loading} label={t("continue")} />
        </form>
      )}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {label}
    </button>
  );
}
