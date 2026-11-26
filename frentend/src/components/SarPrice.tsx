import { useTranslations } from "next-intl";

/** Renders a price with the official Saudi Riyal symbol (self-hosted font,
 * see globals.css) instead of the "ر.س" text abbreviation. <bdi> keeps the
 * number+symbol together as a unit within surrounding RTL text, the same
 * way the plain "150.00 ر.س" string used to flow. */
export default function SarPrice({ amount }: { amount: number | string }) {
  const tCommon = useTranslations("common");
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  // numberingSystem: "latn" forces plain 0-9 digits regardless of site
  // language — "ar-SA" on its own renders Arabic-Indic numerals (٠١٢...).
  const formatted = n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2, numberingSystem: "latn" });

  return (
    <bdi>
      {formatted}{" "}
      <span style={{ fontFamily: "saudi_riyal" }} aria-hidden>
        &#x20c1;
      </span>
      <span className="sr-only"> {tCommon("saudiRiyal")}</span>
    </bdi>
  );
}
