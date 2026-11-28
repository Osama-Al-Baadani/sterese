import { cache } from "react";
import { backendFetch } from "./backend";
import { descendantIds } from "./category-tree";
import { rememberVersion } from "./storefront-cache";
import type { AppConfig, Brand, Category, HomeDepartment, HomeSection, Product, StoreSettings } from "./types";

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  delivery_fee: 0,
  free_shipping_threshold: 0,
  min_order_value: 0,
  whatsapp_phone: "",
  support_phone: "",
  support_email: "",
  working_hours_weekday: "",
  working_hours_friday: "",
  announcement_active: false,
  announcement_text: "",
  badges: [],
  free_delivery_near_branch: {
    enabled: false,
    branch_lat: 24.598,
    branch_lng: 46.639308,
    radius_km: 5,
    fee: 0,
    free_threshold: null,
  },
  cod: { enabled: false, fee_enabled: false, fee_amount: 0 },
  default_max_qty: 10,
};

const EMPTY_APP_CONFIG: AppConfig = {
  webCarouselBanners: [],
  gridTileBanners: [],
  gridStackBanners: [],
  promoCards: [],
  promoBottomCards: [],
  storeSettings: DEFAULT_STORE_SETTINGS,
  deliveryZones: [],
  faqs: [],
  policies: {},
  productQtyLimits: {},
};

function normalizeAppConfig(data: Record<string, unknown> | null | undefined): AppConfig {
  if (!data) return EMPTY_APP_CONFIG;
  return {
    webCarouselBanners: (data.webCarouselBanners as AppConfig["webCarouselBanners"]) ?? [],
    gridTileBanners: (data.gridTileBanners as AppConfig["gridTileBanners"]) ?? [],
    gridStackBanners: (data.gridStackBanners as AppConfig["gridStackBanners"]) ?? [],
    promoCards: (data.promoCards as AppConfig["promoCards"]) ?? [],
    promoBottomCards: (data.promoBottomCards as AppConfig["promoBottomCards"]) ?? [],
    storeSettings: { ...DEFAULT_STORE_SETTINGS, ...(data.storeSettings as Partial<StoreSettings>) },
    deliveryZones: (data.deliveryZones as AppConfig["deliveryZones"]) ?? [],
    faqs: (data.faqs as AppConfig["faqs"]) ?? [],
    policies: (data.policies as AppConfig["policies"]) ?? {},
    productQtyLimits: (data.productQtyLimits as AppConfig["productQtyLimits"]) ?? {},
  };
}

export interface StorefrontInitPayload {
  version?: string;
  appConfig: AppConfig;
  categories: Category[];
  brands: Brand[];
  departments: HomeDepartment[];
  sectionsWithProducts: { section: HomeSection; products: Product[] }[];
}

let lastGoodStorefrontInit: StorefrontInitPayload | null = null;

/**
 * Single unified bootstrap fetch — grabs appConfig, categories, brands,
 * departments, and resolved homepage product sections in ONE request instead
 * of 12-15 round-trips. Shared across Header, Footer, Metadata, Home, and Browse.
 */
export const getStorefrontInit = cache(async (): Promise<StorefrontInitPayload | null> => {
  try {
    const raw = await backendFetch<{
      version?: string;
      appConfig?: Record<string, unknown>;
      categories?: Category[];
      brands?: Brand[];
      departments?: HomeDepartment[];
      sectionsWithProducts?: { section: HomeSection; products: Product[] }[];
    }>("v2/storefront-init", { v2Auth: true, revalidate: 180 });

    const version = typeof raw.version === "string" ? raw.version : undefined;
    rememberVersion(version);

    const payload: StorefrontInitPayload = {
      version,
      appConfig: normalizeAppConfig(raw.appConfig),
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      brands: Array.isArray(raw.brands) ? raw.brands : [],
      departments: Array.isArray(raw.departments) ? raw.departments.filter((d) => d.id > 0) : [],
      sectionsWithProducts: Array.isArray(raw.sectionsWithProducts) ? raw.sectionsWithProducts : [],
    };
    lastGoodStorefrontInit = payload;
    return payload;
  } catch {
    return lastGoodStorefrontInit;
  }
});

export const getAppConfig = cache(async (): Promise<AppConfig> => {
  const init = await getStorefrontInit();
  if (init) return init.appConfig;
  try {
    const data = await backendFetch<Record<string, unknown>>("app-config", { revalidate: 180 });
    return normalizeAppConfig(data);
  } catch {
    return EMPTY_APP_CONFIG;
  }
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const init = await getStorefrontInit();
  if (init && init.categories.length > 0) return init.categories;
  try {
    const data = await backendFetch<Category[]>("v2/categories", { v2Auth: true, revalidate: 300 });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
});

export const getBrands = cache(async (): Promise<Brand[]> => {
  const init = await getStorefrontInit();
  if (init && init.brands.length > 0) return init.brands;
  try {
    const data = await backendFetch<Brand[]>("v2/brands", { v2Auth: true, revalidate: 300 });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
});

export const getHomeDepartments = cache(async (): Promise<HomeDepartment[]> => {
  const init = await getStorefrontInit();
  if (init) return init.departments;
  try {
    const data = await backendFetch<{ departments: HomeDepartment[] }>("home-departments", { revalidate: 180 });
    const list = data.departments ?? [];
    return list.filter((d) => d.id > 0);
  } catch {
    return [];
  }
});

export const getHomeSections = cache(async (): Promise<HomeSection[]> => {
  try {
    const data = await backendFetch<{ sections: HomeSection[] }>("home-sections", { revalidate: 180 });
    return data.sections ?? [];
  } catch {
    return [];
  }
});

export const getCategorySections = cache(
  async (parentId: number, perPage = 8): Promise<{ category: Category; products: Product[] }[]> => {
    try {
      const data = await backendFetch<{ category: Category; products: Product[] }[]>("v2/category-sections", {
        v2Auth: true,
        query: { parent_id: parentId, per_page: perPage },
        revalidate: 180,
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
);

export async function getHomeSectionProducts(section: HomeSection, categories: Category[]): Promise<Product[]> {
  if (section.product_ids.length > 0) {
    return getProducts({ include: section.product_ids.join(","), perPage: section.products_limit, inStockOnly: true });
  }
  switch (section.source_type) {
    case "category": {
      if (section.source_ids.length === 0) return [];
      const ids = new Set<number>();
      for (const id of section.source_ids) {
        for (const d of descendantIds(categories, id)) ids.add(d);
      }
      return getProducts({
        category: Array.from(ids).join(","),
        perPage: section.products_limit,
        inStockOnly: true,
      });
    }
    case "tag":
      return section.source_ids.length > 0
        ? getProducts({ tag: section.source_ids.join(","), perPage: section.products_limit, inStockOnly: true })
        : [];
    case "bestsellers":
      return getProducts({ orderby: "popularity", order: "desc", perPage: section.products_limit, inStockOnly: true });
    case "featured":
      return getProducts({ featured: true, perPage: section.products_limit, inStockOnly: true });
    default:
      return [];
  }
}

export interface ProductFilters {
  category?: string;
  tag?: string;
  brand?: string;
  search?: string;
  include?: string;
  orderby?: "popularity" | "date" | "price" | "sort_order";
  order?: "asc" | "desc";
  onSale?: boolean;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  page?: number;
  perPage?: number;
  fresh?: boolean;
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  try {
    const data = await backendFetch<Product[]>("v2/products", {
      v2Auth: true,
      query: {
        category: filters.category,
        tag: filters.tag,
        "pwb-brand": filters.brand,
        search: filters.search,
        include: filters.include,
        orderby: filters.orderby ?? "popularity",
        order: filters.order ?? "desc",
        on_sale: filters.onSale ? "true" : undefined,
        featured: filters.featured ? "true" : undefined,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        stock_status: filters.inStockOnly ? "instock" : undefined,
        page: filters.page ?? 1,
        per_page: filters.perPage ?? 24,
      },
      revalidate: filters.search || filters.fresh ? false : 180,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const getProduct = cache(async (id: number): Promise<Product | null> => {
  try {
    return await backendFetch<Product>(`v2/products/${id}`, { v2Auth: true, revalidate: 180 });
  } catch {
    const fallback = await getProducts({ include: String(id), perPage: 1 });
    return fallback.find((p) => p.id === id) ?? null;
  }
});
