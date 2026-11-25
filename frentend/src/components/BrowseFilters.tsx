import { Link } from "@/i18n/navigation";
import type { Brand } from "@/lib/types";

export default function BrowseFilters({
  brands,
  current,
}: {
  brands: Brand[];
  current: {
    search?: string;
    category?: string;
    brand?: string;
    sort: string;
    inStock: boolean;
  };
}) {
  // A brand with nothing in it isn't a useful filter option — it would just
  // lead to an always-empty result.
  const availableBrands = brands.filter((b) => b.count > 0);

  const hasActiveFilters =
    Boolean(current.category) || Boolean(current.brand) || current.inStock || current.sort !== "popularity-desc";

  return (
    <form action="/browse" method="get" className="space-y-6">
      {current.search && <input type="hidden" name="search" value={current.search} />}
      {/* Sort has its own control up in the page header, and category has
          its own drill-down tabs above the product grid — both preserved
          here as hidden fields so applying a brand/in-stock filter doesn't
          reset them. A duplicate flat category list used to live in this
          sidebar too, dumping all ~200 categories (parents and children
          mixed, unrelated to whatever's selected) with no relation to the
          tabs above — removed in favor of the one working category picker. */}
      {current.sort !== "popularity-desc" && <input type="hidden" name="sort" value={current.sort} />}
      {current.category && <input type="hidden" name="category" value={current.category} />}

      {hasActiveFilters && (
        <Link
          href={current.search ? `/browse?search=${encodeURIComponent(current.search)}` : "/browse"}
          className="inline-block text-xs font-semibold text-navy-500 underline hover:text-brand-700"
        >
          مسح كل الفلاتر
        </Link>
      )}

      {availableBrands.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy-900">العلامة التجارية</h3>
          <div className="max-h-64 space-y-1 overflow-y-auto pe-1">
            <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-700 hover:bg-navy-900/[0.03]">
              <input type="radio" name="brand" value="" defaultChecked={!current.brand} className="accent-brand-600" />
              الكل
            </label>
            {availableBrands.map((b) => (
              <label key={b.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-700 hover:bg-navy-900/[0.03]">
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="brand"
                    value={b.slug}
                    defaultChecked={current.brand === b.slug}
                    className="accent-brand-600"
                  />
                  {b.name}
                </span>
                <span className="text-xs text-navy-300">{b.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-navy-700">
        <input type="checkbox" name="in_stock" value="1" defaultChecked={current.inStock} className="accent-brand-600" />
        المتوفر فقط
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
      >
        تطبيق الفلاتر
      </button>
    </form>
  );
}
