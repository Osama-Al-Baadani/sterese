export interface Banner {
  id: number;
  image_url: string | null;
  link_type: "none" | "category" | "search" | "tag" | "brand";
  link_value: string | null;
}

export interface PromoCard extends Banner {
  title_ar: string | null;
  subtitle_ar: string | null;
}

export interface StoreSettings {
  delivery_fee: number;
  free_shipping_threshold: number;
  min_order_value: number;
  whatsapp_phone: string;
  support_phone: string;
  support_email: string;
  working_hours_weekday: string;
  working_hours_friday: string;
  announcement_active: boolean;
  announcement_text: string;
  badges: string[];
  free_delivery_near_branch: NearBranchDelivery;
  cod: CodSettings;
  default_max_qty: number;
}

export interface NearBranchDelivery {
  enabled: boolean;
  branch_lat: number;
  branch_lng: number;
  radius_km: number;
  fee: number;
  free_threshold: number | null;
}

export interface CodSettings {
  enabled: boolean;
  fee_enabled: boolean;
  fee_amount: number;
}

export interface DeliveryZone {
  id: number;
  name: string;
  cities: string[];
  base_fee: number;
  free_threshold: number;
  promo_active: boolean;
  promo_type: string | null;
  promo_label: string;
  promo_end: string | null;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Policy {
  title: string;
  sections: { heading: string; body: string }[];
}

export interface AppConfig {
  webCarouselBanners: Banner[];
  gridTileBanners: Banner[];
  gridStackBanners: Banner[];
  promoCards: PromoCard[];
  promoBottomCards: PromoCard[];
  storeSettings: StoreSettings;
  deliveryZones: DeliveryZone[];
  faqs: Faq[];
  policies: Partial<Record<"return" | "privacy" | "terms", Policy>>;
  productQtyLimits: Record<string, number>;
}

export interface CustomerAddress {
  id: number;
  phone: string;
  label: "home" | "work" | "friend" | "other";
  address_text: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  zone: string | null;
  is_default: boolean;
}

export interface NativeOrderItem {
  id: number;
  name?: string;
  sku?: string | null;
  image?: string | null;
  quantity: number;
  price?: number;
  bundle_qty?: number | null;
}

export interface NativeOrder {
  id: number;
  order_number: number;
  status: string;
  delivery_status: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  city: string;
  subtotal: number;
  delivery_fee: number;
  cod_fee: number;
  discount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  items: NativeOrderItem[];
  created_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  /** English translation — null until an admin fills it in for this category */
  name_en: string | null;
  slug: string;
  parent: number;
  description: string | null;
  image: { src: string } | null;
  count: number;
}

// Raw entry from /api/home-departments — an admin-curated pick for the
// homepage "تسوق حسب قسمك المفضل" grid, either a category (uses its own
// name/image) or a tag (needs its own title/icon since tags have neither).
export interface HomeDepartment {
  source_type: "category" | "tag";
  id: number;
  title: string | null;
  icon: string | null;
  image_url: string | null;
}

// Raw entry from /api/home-sections — an admin-curated homepage block
// showing a product carousel from a category/tag/bestsellers/featured pool,
// with its own optional promo banner. Same feature already live in the app;
// banner_*_web is a separate image/link specifically for the website layout.
export interface HomeSectionBanner {
  image_url: string;
  link: string | null;
}

export interface HomeSection {
  id: number;
  title: string;
  icon: string | null;
  source_type: "category" | "tag" | "bestsellers" | "featured";
  source_id: number | null;
  source_ids: number[];
  product_ids: number[];
  products_limit: number;
  /** @deprecated first item of banners — kept for older clients, use banners instead */
  banner_url: string;
  /** @deprecated first item of banners — kept for older clients, use banners instead */
  banner_link: string;
  /** @deprecated first item of banners_web — use banners_web instead */
  banner_url_web: string;
  /** @deprecated first item of banners_web — use banners_web instead */
  banner_link_web: string;
  banners: HomeSectionBanner[];
  banners_web: HomeSectionBanner[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  count: number;
}

export interface ProductImage {
  src: string;
}

export interface ProductVariationAttribute {
  attribute: string;
  value: string;
}

export interface ProductVariation {
  id: number;
  sku: string | null;
  price: string;
  regular_price: string;
  sale_price: string | null;
  stock_status: string;
  stock_quantity: number | null;
  image: string | null;
  attributes: ProductVariationAttribute[];
}

export interface Product {
  id: number;
  name: string;
  /** English translation — null until an admin fills it in for this product */
  name_en: string | null;
  slug: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  type: string;
  description: string | null;
  description_en: string | null;
  short_description: string | null;
  short_description_en: string | null;
  price: string;
  regular_price: string;
  sale_price: string | null;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | string;
  stock_quantity: number | null;
  featured: boolean;
  bundle_qty: number | null;
  average_rating: string;
  rating_count: number;
  total_sales: number;
  images: ProductImage[];
  categories: { id: number; name: string; name_en: string | null; slug: string }[];
  tags: { id: number; name: string; name_en: string | null; slug: string }[];
  related_product_ids: number[];
  brands: { id: number; name: string; name_en: string | null; slug: string; image: string | null }[];
  variations?: ProductVariation[];
}

export interface CustomerAddress {
  id: number;
  phone: string;
  label: "home" | "work" | "friend" | "other";
  address_text: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  zone: string | null;
  is_default: boolean;
}

export interface CouponValidation {
  valid: true;
  code: string;
  description: string | null;
  type: "percent" | "fixed";
  amount: number;
  free_shipping: boolean;
  discount_amount: number;
}

export interface Customer {
  id: number;
  first_name?: string;
  name?: string;
  email?: string;
  billing?: { phone?: string; email?: string; first_name?: string };
}

/** Resolves a banner/promo-card's link into an internal browse-page URL. */
export function linkHref(linkType: Banner["link_type"], linkValue: string | null): string {
  if (!linkValue) return "/browse";
  switch (linkType) {
    case "category":
      return `/browse?category=${encodeURIComponent(linkValue)}`;
    case "search":
      return `/browse?search=${encodeURIComponent(linkValue)}`;
    case "tag":
      return `/browse?tag=${encodeURIComponent(linkValue)}`;
    case "brand":
      return `/browse?brand=${encodeURIComponent(linkValue)}`;
    default:
      return "/browse";
  }
}
