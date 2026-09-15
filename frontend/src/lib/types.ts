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

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string | null;
  colour: string | null;
  price_pence: number;
  stock_quantity: number;
  in_stock: boolean;
  low_stock: boolean;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_pence: number;
  is_featured: boolean;
  is_active?: boolean;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  category_id?: number;
  images: ProductImage[];
  variants?: ProductVariant[];
  in_stock: boolean | null;
  min_price_pence: number;
}

export interface ProductSearchParams {
  category?: string;
  search?: string;
  size?: string;
  colour?: string;
  min_price?: number;
  max_price?: number;
  sort?: "price_asc" | "price_desc" | "best_selling" | "latest";
  per_page?: number;
  page?: number;
}

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
}

export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  size: string | null;
  colour: string | null;
  unit_price_pence: number;
  quantity: number;
  line_total_pence: number;
}

export interface Shipment {
  courier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
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
  address: Address;
  items: OrderItem[];
  shipment: Shipment | null;
}

export interface CheckoutPreview {
  subtotal_pence: number;
  discount_pence: number;
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

export interface AdminDashboard {
  orders_count: number;
  revenue_pence: number;
  pending_payment_count: number;
  low_stock: Array<{
    variant_id: number;
    product_name: string;
    sku: string;
    stock_quantity: number;
  }>;
  out_of_stock_count: number;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer: string;
    total_pence: number;
    status: OrderStatus;
    created_at: string;
  }>;
}

export interface ApiValidationError {
  message: string;
  errors?: Record<string, string[]>;
}
