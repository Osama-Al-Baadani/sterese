import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Baby,
  Bed,
  CupSoda,
  Gamepad2,
  Gift,
  Hammer,
  Home,
  PenTool,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  SprayCan,
  UtensilsCrossed,
} from "lucide-react";

const PALETTE = [
  { bg: "bg-brand-100", fg: "text-brand-700" },
  { bg: "bg-rose-100", fg: "text-rose-600" },
  { bg: "bg-sky-100", fg: "text-sky-600" },
  { bg: "bg-purple-100", fg: "text-purple-600" },
  { bg: "bg-amber-100", fg: "text-amber-600" },
  { bg: "bg-teal-100", fg: "text-teal-600" },
  { bg: "bg-pink-100", fg: "text-pink-600" },
  { bg: "bg-indigo-100", fg: "text-indigo-600" },
  { bg: "bg-lime-100", fg: "text-lime-700" },
  { bg: "bg-cyan-100", fg: "text-cyan-600" },
  { bg: "bg-orange-100", fg: "text-orange-600" },
  { bg: "bg-emerald-100", fg: "text-emerald-600" },
];

const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  [/مشروبات|عصائر|مياه|قهوة|شاي/i, CupSoda],
  [/مقاضي|بقال|سوبر ?ماركت/i, ShoppingBasket],
  [/خضار|فواكه|غذائ|طعام|مواد/i, Apple],
  [/تنظيف|منظف/i, SprayCan],
  [/منزل|أدوات المنزل/i, Home],
  [/عناية|تجميل|مكياج/i, Sparkles],
  [/فراش|مفروشات|سرير/i, Bed],
  [/أواني|أطباق|مطبخ/i, UtensilsCrossed],
  [/ألعاب|أطفال/i, Gamepad2],
  [/مكتب|قرطاسية/i, PenTool],
  [/أدوات|عدد|صيانة/i, Hammer],
  [/ملابس|أزياء/i, Shirt],
  [/رضاعة|بيبي/i, Baby],
  [/هدايا|هدية/i, Gift],
];

export function categoryStyle(name: string, index: number) {
  const palette = PALETTE[index % PALETTE.length];
  const match = KEYWORD_ICONS.find(([re]) => re.test(name));
  return { ...palette, Icon: match ? match[1] : ShoppingBag };
}
