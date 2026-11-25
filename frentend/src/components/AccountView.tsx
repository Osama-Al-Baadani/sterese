"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Gift, Heart, Home, LogOut, MapPin, Package, Pencil, Plus, Trash2, User, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { CustomerAddress, DeliveryZone } from "@/lib/types";
import type { LocationPickResult } from "./LocationPickerModal";

const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), { ssr: false });

const LABELS: Record<CustomerAddress["label"], { text: string; Icon: typeof Home }> = {
  home: { text: "المنزل", Icon: Home },
  work: { text: "العمل", Icon: Briefcase },
  friend: { text: "صديق", Icon: Users },
  other: { text: "أخرى", Icon: MapPin },
};

export default function AccountView({ deliveryZones }: { deliveryZones: DeliveryZone[] }) {
  const router = useRouter();
  const { customer, authToken, hydrated, isLoggedIn, logout, setProfileName } = useAuth();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [showPicker, setShowPicker] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<LocationPickResult | null>(null);
  const [pendingLabel, setPendingLabel] = useState<CustomerAddress["label"]>("home");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace("/login");
  }, [hydrated, isLoggedIn, router]);

  // How many of the free-first-N-orders deliveries this customer has left —
  // surfaced here (not just as a 0 fee buried at checkout) so it's a benefit
  // they can actually see and plan around. null = not loaded yet/unknown;
  // 0 hides the badge entirely (used up, or the perk is off store-wide).
  const [freeDeliveryRemaining, setFreeDeliveryRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!customer) return;
    fetch(`/api/delivery-eligibility?phone=${encodeURIComponent(customer.phone)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFreeDeliveryRemaining(data?.remaining ?? null))
      .catch(() => setFreeDeliveryRemaining(null));
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    fetch(`/api/account/addresses?phone=${encodeURIComponent(customer.phone)}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    })
      .then((r) => r.json())
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [customer, authToken]);

  async function saveAddress() {
    if (!customer || !pendingLocation) return;
    setSavingAddress(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          phone: customer.phone,
          label: pendingLabel,
          address_text: pendingLocation.address,
          city: pendingLocation.city,
          lat: pendingLocation.lat,
          lng: pendingLocation.lng,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setAddresses((prev) => [...prev, created]);
        setPendingLocation(null);
      }
    } finally {
      setSavingAddress(false);
    }
  }

  async function deleteAddress(id: number) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/account/addresses/${id}`, {
      method: "DELETE",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    await setProfileName(nameInput.trim());
    setEditingName(false);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!hydrated || !customer) {
    return <div className="py-20 text-center text-navy-400">جارٍ التحميل...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {showPicker && (
        <LocationPickerModal
          deliveryZones={deliveryZones}
          onClose={() => setShowPicker(false)}
          onConfirm={(result) => {
            setPendingLocation(result);
            setShowPicker(false);
          }}
        />
      )}

      {/* Profile card */}
      <section className="rounded-2xl border border-navy-900/8 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <User className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="input py-1.5 text-sm"
                  placeholder="الاسم الكامل"
                />
                <button type="button" onClick={saveName} className="shrink-0 text-xs font-bold text-brand-700">
                  حفظ
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-extrabold text-navy-900">
                  {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "بدون اسم"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(customer.firstName);
                    setEditingName(true);
                  }}
                  className="text-navy-300 hover:text-navy-600"
                  aria-label="تعديل الاسم"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            )}
            <p dir="ltr" className="mt-0.5 text-sm text-navy-500">
              {customer.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-navy-900/10 px-3 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-900/5"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            تسجيل الخروج
          </button>
        </div>
      </section>

      {!!freeDeliveryRemaining && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <p className="flex-1 text-sm font-bold text-amber-800">
            باقي لك {freeDeliveryRemaining} {freeDeliveryRemaining === 1 ? "توصيلة مجانية" : "توصيلات مجانية"} 🎉
          </p>
        </div>
      )}

      {/* Orders link */}
      <Link
        href="/account/orders"
        className="flex items-center gap-3 rounded-2xl border border-navy-900/8 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Package className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1 font-bold text-navy-900">طلباتي</span>
      </Link>

      {/* Favorites link */}
      <Link
        href="/favorites"
        className="flex items-center gap-3 rounded-2xl border border-navy-900/8 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Heart className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1 font-bold text-navy-900">المفضلة</span>
      </Link>

      {/* Addresses */}
      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">عناويني</h2>

        {loadingAddresses ? (
          <p className="text-sm text-navy-400">جارٍ التحميل...</p>
        ) : (
          <div className="space-y-2.5">
            {addresses.map((a) => {
              const { text, Icon } = LABELS[a.label];
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-navy-900/8 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900/5 text-navy-500">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-navy-500">{text}</p>
                    <p className="mt-0.5 text-sm font-semibold text-navy-900">{a.address_text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAddress(a.id)}
                    className="shrink-0 text-navy-300 hover:text-rose-600"
                    aria-label="حذف العنوان"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {pendingLocation ? (
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5">
            <p className="text-sm font-bold text-navy-900">{pendingLocation.address}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(Object.keys(LABELS) as CustomerAddress["label"][]).map((key) => {
                const { text, Icon } = LABELS[key];
                const selected = pendingLabel === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPendingLabel(key)}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-bold transition ${
                      selected ? "border-brand-600 bg-brand-600 text-white" : "border-navy-900/10 bg-white text-navy-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {text}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddress}
                className="flex-1 rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                حفظ العنوان
              </button>
              <button
                type="button"
                onClick={() => setPendingLocation(null)}
                className="rounded-full border border-navy-900/10 px-4 py-2.5 text-sm font-bold text-navy-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-3.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إضافة عنوان جديد
          </button>
        )}
      </section>
    </div>
  );
}
