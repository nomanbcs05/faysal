import { Database } from './integrations/supabase/types';

export type Product = Database['public']['Tables']['products']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

export interface OrderWithDetails extends Order {
  customers: Customer | null;
  order_items: (OrderItem & { products: Product | null })[];
  dailyId?: string;
  server_name?: string;
}

export interface FormattedOrder {
  id?: string;
  orderNumber: string;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
      sku?: string;
      cost?: number;
      stock?: number;
      category?: string;
      image?: string;
      description?: string;
    };
    quantity: number;
    lineTotal?: number;
  }[];
  customer: {
    id: string | null;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  orderType: string;
  createdAt: Date;
  cashierName: string;
  serverName: string;
  tableId?: string;
}

export interface KOTFormattedOrder {
  orderNumber: string;
  items: {
    product: {
      id: string | null;
      name: string;
    };
    quantity: number;
  }[];
  customer: {
    id: string | null;
    name: string;
  } | null;
  orderType: string;
  createdAt: Date;
  cashierName: string;
  serverName: string;
  tableId?: string;
}

