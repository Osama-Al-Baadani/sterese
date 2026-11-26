"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AccountIcon() {
  const tNav = useTranslations("nav");
  const { isLoggedIn, hydrated } = useAuth();

  return (
    <Link
      href={hydrated && isLoggedIn ? "/account" : "/login"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-900/5"
      aria-label={tNav("account")}
    >
      <User className="h-5 w-5" aria-hidden />
    </Link>
  );
}
