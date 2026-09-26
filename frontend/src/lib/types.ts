export type Role = "customer" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: number | null;
  children?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  /** Admin list: all products. Storefront list: only browsable ones. */
  products_count?: number;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  colour: string | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string | null;
  colour: string | null;
  price_pence: number;
  stock_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
  low_stock: boolean;
  is_active: boolean;
  /** Normal price while a sale is knocking it down; null when not on sale. */
  compare_at_price_pence: number | null;
}

/** The sale currently pricing a product (see backend SalePricing). */
export interface ProductSale {
  id: number;
  name: string;
  label: string;
  discount_percent: number;
  ends_at: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_pence: number;
  is_featured: boolean;
  is_active?: boolean;
  hide_when_out_of_stock?: boolean;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  category_id?: number;
  brand_id?: number | null;
  /** The product's live brand; null when it has none or the brand is switched off. */
  brand: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
  variants?: ProductVariant[];
  in_stock: boolean | null;
  /** Average review rating (1 decimal); null/absent when unreviewed. */
  rating_avg?: number | null;
  rating_count?: number;
  /** What the shopper pays ("from £x"), with any live sale applied. */
  min_price_pence: number;
  /** Pre-sale price of that same variant, shown struck through; null when not on sale. */
  compare_at_price_pence: number | null;
  sale: ProductSale | null;
}

/** What a shopper can narrow a listing by — GET /api/products/filters. */
export interface ProductFilterOptions {
  sizes: string[];
  colours: string[];
  price: { min_pence: number | null; max_pence: number | null };
  on_sale_count: number;
  /** Top-level categories with product counts; empty when already inside a category. */
  categories: Array<{ slug: string; name: string; count: number }>;
  brands: Array<{ slug: string; name: string; count: number }>;
}

export type ProductSort = "latest" | "price_asc" | "price_desc" | "best_selling" | "discount";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

export interface Address {
  id: number;
  label: string | null;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
  phone: string | null;
  is_default: boolean;
}

export interface CartItem {
  id: number;
  quantity: number;
  unit_price_pence: number;
  compare_at_unit_price_pence: number | null;
  sale_name: string | null;
  line_total_pence: number;
  variant: {
    id: number;
    sku: string;
    size: string | null;
    colour: string | null;
    stock_quantity: number;
  };
  product: {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
  };
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal_pence: number;
  /** What live sales are currently taking off, versus normal prices. */
  savings_pence: number;
}

export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  size: string | null;
  colour: string | null;
  unit_price_pence: number;
  /** Normal price when the line was bought on sale; null for a full-price line. */
  original_unit_price_pence: number | null;
  /** Name of the sale the line was bought under, when the order/customer relations are loaded. */
  sale_name: string | null;
  quantity: number;
  line_total_pence: number;
  image_url: string | null;
}

export interface Shipment {
  courier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
}

export interface OrderDiscountCode {
  code: string;
  type: "percentage" | "fixed";
  value: number;
}

export interface OrderPayment {
  provider: string;
  status: string;
  amount_pence: number;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  subtotal_pence: number;
  discount_pence: number;
  vat_pence: number;
  shipping_pence: number;
  total_pence: number;
  currency: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  customer?: {
    id: number;
    name: string;
    email: string;
  };
  address: Address | null;
  items: OrderItem[];
  shipment: Shipment | null;
  /** Only present when the detail relations were loaded (admin/customer single-order views, not list views). */
  discount_code?: OrderDiscountCode | null;
  payment?: OrderPayment | null;
}

export interface CheckoutPreview {
  subtotal_pence: number;
  discount_pence: number;
  sale_savings_pence: number;
  shipping_pence: number;
  vat_pence: number;
  total_pence: number;
  vat_rate: number;
}

export interface DiscountCode {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  expires_at: string | null;
  usage_limit: number | null;
  usages_count?: number;
  is_active: boolean;
}

/** A variant needing attention on the admin dashboard (low or out of stock). */
export interface AdminStockRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  size: string | null;
  colour: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface AdminDashboard {
  orders_count: number;
  revenue_pence: number;
  pending_payment_count: number;
  low_stock: AdminStockRow[];
  /** Up to 20 sold-out variants; `out_of_stock_count` is the true total. */
  out_of_stock: AdminStockRow[];
  out_of_stock_count: number;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer: string;
    total_pence: number;
    status: OrderStatus;
    created_at: string;
  }>;
  revenue_growth_percent: number | null;
  daily_revenue: Array<{ date: string; revenue_pence: number }>;
}

/** A live sale as the storefront sees it — GET /api/sales/active. */
export interface ActiveSale {
  id: number;
  name: string;
  description: string | null;
  label: string;
  applies_to: SaleScope;
  categories: Array<{ name: string; slug: string }>;
  brands: Array<{ name: string; slug: string }>;
  /** Individually chosen products (lines and brands are named above). */
  products_count: number;
  ends_at: string | null;
  weekdays: number[] | null;
}

/** "all" = the whole shop; "selected" = any mix of lines (categories), brands and products. */
export type SaleScope = "all" | "selected";
export type SaleStatus = "live" | "scheduled" | "ended" | "inactive";

/** A sale as the admin manages it — /api/admin/sales. */
export interface Sale {
  id: number;
  name: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  discount_label: string;
  applies_to: SaleScope;
  category_ids?: number[];
  brand_ids?: number[];
  product_ids?: number[];
  categories?: Array<{ id: number; name: string }>;
  brands?: Array<{ id: number; name: string }>;
  products?: Array<{ id: number; name: string }>;
  starts_at: string | null;
  ends_at: string | null;
  /** Wall-clock time in the shop's timezone ("2026-12-01T00:00") — what the form inputs read and write. */
  starts_at_local: string | null;
  ends_at_local: string | null;
  /** ISO weekdays (1 = Monday … 7 = Sunday); null runs every day. */
  active_weekdays: number[] | null;
  is_active: boolean;
  status: SaleStatus;
  created_at: string;
}

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m" | "ytd" | "custom";

export interface AnalyticsKpi {
  current: number;
  previous: number;
  change_percent: number | null;
}

export interface AdminAnalytics {
  range: {
    key: AnalyticsRange;
    from: string;
    to: string;
    days: number;
    granularity: "day" | "week" | "month";
    previous_from: string;
    previous_to: string;
    timezone: string;
  };
  kpis: {
    revenue_pence: AnalyticsKpi;
    orders: AnalyticsKpi;
    average_order_value_pence: AnalyticsKpi;
    units_sold: AnalyticsKpi;
    new_customers: AnalyticsKpi;
    signups: AnalyticsKpi;
  };
  money: {
    list_price_pence: number;
    sale_savings_pence: number;
    code_discounts_pence: number;
    shipping_pence: number;
    vat_pence: number;
    total_pence: number;
  };
  customers: { new: number; returning: number };
  timeseries: Array<{
    date: string;
    revenue_pence: number;
    orders: number;
    previous_revenue_pence: number | null;
  }>;
  weekdays: Array<{ weekday: number; revenue_pence: number; orders: number }>;
  top_products: Array<{ product_id: number | null; name: string; units: number; revenue_pence: number }>;
  categories: Array<{ name: string; units: number; revenue_pence: number }>;
  statuses: Array<{ status: OrderStatus; count: number }>;
  sales: Array<{
    id: number;
    name: string;
    orders: number;
    units: number;
    revenue_pence: number;
    savings_pence: number;
  }>;
  discount_codes: Array<{ code: string; uses: number; discount_pence: number; revenue_pence: number }>;
}

/** The admin notification bell — GET /api/admin/notifications. */
export type AdminNotificationType = "order" | "low_stock" | "out_of_stock" | "stale_checkout" | "sale";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  link: string;
  created_at: string;
  unread: boolean;
}

export interface AdminNotificationFeed {
  notifications: AdminNotification[];
  unread_count: number;
  read_at: string | null;
}

/** A customer as the admin sees them — GET /api/admin/customers. */
export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  /** Paid orders only. */
  orders_count: number;
  total_spent_pence: number;
  addresses?: Address[];
}

export interface ApiValidationError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  author: string;
  created_at: string;
}

export interface ReviewsResponse {
  summary: { average: number | null; count: number; distribution: Record<string, number> };
  can_review: boolean;
  my_review: Review | null;
  data: Review[];
  meta: { current_page: number; last_page: number };
}
