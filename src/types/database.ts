// Types for the application
export type AppRole = 'owner' | 'cashier' | 'waiter' | 'cook';
export type OrderType = 'table' | 'delivery' | 'pickup';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid' | 'cancelled';
export type UnitType = 'gr' | 'kg' | 'ml' | 'lt' | 'und';
export type PaymentMethod = 'usd_cash' | 'bs_cash' | 'zelle' | 'pago_movil' | 'punto';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: UnitType;
  stock_actual: number;
  stock_minimo: number;
  costo_promedio: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id?: string;
  name: string;
  description?: string;
  price_usd: number;
  image_url?: string;
  is_available: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
  ingredient?: Ingredient;
}

export interface Order {
  id: string;
  order_number: number;
  order_type: OrderType;
  table_number?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  status: OrderStatus;
  subtotal_usd: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_usd: number;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  exchange_rate: number;
  amount_usd: number;
  reference?: string;
  processed_by: string;
  created_at: string;
}

export interface ExchangeRateSetting {
  bcv: number;
  parallel: number;
  active: 'bcv' | 'parallel';
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}
