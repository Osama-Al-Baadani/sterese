"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Bot, ExternalLink, Loader2, PackageX, Send, Sparkles, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartDrawerOpen } from "@/lib/cart-context";
import SarPrice from "./SarPrice";

interface ChatProduct {
  id: number;
  name: string;
  name_en?: string | null;
  price: string;
  regular_price: string;
  on_sale: boolean;
  in_stock: boolean;
  image: string | null;
}

interface Message {
  role: "user" | "model";
  text: string;
  products?: ChatProduct[];
}

export default function AiAdvisorChat() {
  const locale = useLocale();
  const pathname = usePathname();
  const drawerOpen = useCartDrawerOpen();
  const isAr = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const welcomeText = isAr
    ? "أهلاً بك! أنا المستشار الذكي في المتجر، اسألني عن أي منتج، سعره، أو توفره وسأساعدك فوراً."
    : "Welcome! I'm your smart store advisor. Ask me about any product, price, or availability.";
  const [messages, setMessages] = useState<Message[]>([]);
  const displayMessages: Message[] = [{ role: "model", text: welcomeText }, ...messages];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    const updatedMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text:
            data.reply ||
            (isAr ? "عذراً، حدث خطأ بسيط. حاول مرة أخرى." : "Sorry, something went wrong. Please try again."),
          products: Array.isArray(data.products) ? data.products : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: isAr
            ? "تعذر الاتصال بالخادم، تأكد من اتصالك بالإنترنت."
            : "Could not reach the server. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Hide completely on checkout or while the cart drawer is open so it never
  // overlaps payment controls or slide-over drawers.
  if (drawerOpen || pathname.startsWith("/checkout")) {
    return null;
  }

  const hasStickyProductBar = pathname.startsWith("/product/");
  const mobileBottomClass = hasStickyProductBar
    ? "bottom-[calc(134px+env(safe-area-inset-bottom,0px))]"
    : "bottom-[calc(76px+env(safe-area-inset-bottom,0px))]";

  return (
    <div
      className={`fixed ${mobileBottomClass} end-3.5 flex flex-col items-end md:bottom-6 md:end-6 ${
        isOpen ? "z-50" : "z-30"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {isOpen && (
        <div className="mb-3 flex h-[470px] max-h-[calc(100dvh-210px)] w-[calc(100vw-1.75rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-navy-900/10 bg-white shadow-2xl shadow-navy-900/20 md:max-h-[calc(100dvh-120px)]">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-l from-navy-900 to-navy-700 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-navy-900 shadow-sm">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
                  {isAr ? "المستشار الذكي للمتجر" : "Smart Store Advisor"}
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                </h3>
                <p className="text-[11px] text-white/75">
                  {isAr ? "متصل الآن • يجيب فوراً" : "Online • Instant answers"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={isAr ? "إغلاق" : "Close"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-4 text-sm">
            {displayMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-2 ${msg.role === "user" ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
                    msg.role === "user"
                      ? "rounded-br-none bg-brand-600 font-semibold text-white shadow-sm"
                      : "rounded-bl-none border border-navy-900/8 bg-white text-navy-900 shadow-xs"
                  }`}
                >
                  {msg.text}
                </div>

                {msg.products && msg.products.length > 0 && (
                  <div className="flex w-full max-w-[92%] flex-col gap-2">
                    {msg.products.map((p) => {
                      const pName = !isAr && p.name_en ? p.name_en : p.name;
                      return (
                        <Link
                          key={p.id}
                          href={`/product/${p.id}`}
                          onClick={() => setIsOpen(false)}
                          className="group flex items-center gap-2.5 rounded-2xl border border-navy-900/10 bg-white p-2 shadow-xs transition hover:border-brand-500 hover:shadow-md"
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-navy-900/[0.04]">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={pName}
                                fill
                                sizes="56px"
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-navy-300">
                                <PackageX className="h-5 w-5" aria-hidden />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-xs font-bold text-navy-900 group-hover:text-brand-700">
                              {pName}
                            </span>
                            <span className="mt-1 flex items-center gap-2">
                              <span className="text-xs font-extrabold text-brand-700">
                                <SarPrice amount={p.price} />
                              </span>
                              {p.on_sale && (
                                <span className="text-[10px] text-navy-300 line-through">
                                  <SarPrice amount={p.regular_price} />
                                </span>
                              )}
                              {!p.in_stock && (
                                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                  {isAr ? "نفد" : "Out"}
                                </span>
                              )}
                            </span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-navy-300 transition group-hover:text-brand-600" aria-hidden />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl border border-navy-900/8 bg-white px-3.5 py-2 text-xs font-medium text-navy-500 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden />
                  {isAr ? "جاري البحث في المتجر..." : "Searching store..."}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-navy-900/8 bg-white p-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAr ? "اسأل عن أي منتج أو سعر..." : "Ask about any product or price..."}
              className="flex-1 rounded-full bg-navy-900/[0.04] px-4 py-2 text-sm text-navy-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label={isAr ? "إرسال" : "Send"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </button>
          </form>
        </div>
      )}

      {/* Compact Floating Button — circular icon by default, expands label only on desktop hover */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isAr ? "المستشار الذكي — اسألني عن أي منتج أو سعر" : "Smart Advisor — Ask about products & prices"}
        className="group flex items-center rounded-full bg-gradient-to-l from-navy-900 to-navy-700 p-1.5 text-white shadow-lg shadow-navy-900/25 ring-2 ring-brand-500/80 transition-all duration-200 hover:scale-105 hover:ring-brand-500"
        aria-label={isAr ? "فتح المستشار الذكي" : "Open Smart Advisor"}
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-navy-900 shadow-xs md:h-10 md:w-10">
          {isOpen ? (
            <X className="h-4.5 w-4.5" aria-hidden />
          ) : (
            <Bot className="h-5 w-5" aria-hidden />
          )}
          {!isOpen && (
            <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-[1.5px] border-navy-900 bg-emerald-500" />
            </span>
          )}
        </span>

        {!isOpen && (
          <span className="hidden max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 md:block md:group-hover:max-w-44 md:group-hover:ps-2 md:group-hover:pe-2.5 md:group-hover:opacity-100">
            <span className="flex items-center gap-1 text-xs font-extrabold text-white">
              {isAr ? "المستشار الذكي" : "Smart Advisor"}
              <Sparkles className="h-3 w-3 shrink-0 text-brand-500" aria-hidden />
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
