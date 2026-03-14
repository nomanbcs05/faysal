import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'] & {
  product_name?: string;
  product_category?: string;
};

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Helper to validate UUID - simplified to be more robust
const isValidUUID = (uuid: string) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  available: boolean;
  created_at: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface Kitchen {
  id: string;
  name: string;
  created_at: string;
}

export interface DailyRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  starting_amount: number;
  ending_amount: number | null;
  status: 'open' | 'closed';
  notes: string | null;
}

export const api = {
  registers: {
    getOpen: async () => {
      const { data, error } = await supabase
        .from('daily_registers' as any)
        .select('*')
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      return data as DailyRegister | null;
    },
    start: async (startingAmount: number, openedAt?: string) => {
      const { data, error } = await supabase
        .from('daily_registers' as any)
        .insert({
          starting_amount: startingAmount,
          status: 'open',
          opened_at: openedAt || new Date().toISOString()
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as DailyRegister;
    },
    close: async (id: string, endingAmount: number, notes?: string) => {
      const { data, error } = await supabase
        .from('daily_registers' as any)
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          ending_amount: endingAmount,
          notes: notes
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DailyRegister;
    }
  },
  categories: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('categories' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    create: async (category: Omit<Category, 'id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Category;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  products: {
    seedArabicBroast: async () => {
      const items = [
        { name: "Skin Spicy Injected Full Kukkar", price: 2000, cost: 0, sku: "SIB-FULL-K", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Broast Leg/Thai 2Pcs", price: 600, cost: 0, sku: "SIB-LT-2", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Broast Chest/Wing 2Pcs", price: 600, cost: 0, sku: "SIB-CW-2", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Half Broast 4Pcs", price: 1100, cost: 0, sku: "SIB-HALF-4", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Full Broast 8Pcs", price: 2200, cost: 0, sku: "SIB-FULL-8", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "COMBO 1 (1 Qtr Broast, 1 Zinger, Drink, Bun, Fries)", price: 999, cost: 0, sku: "COMBO-1", category: "Arabic Broast", image: "🍱", stock: 100 },
        { name: "COMBO 2 (Half Broast, Fries, 2 Bun, 2 Sauce, Drink)", price: 1300, cost: 0, sku: "COMBO-2", category: "Arabic Broast", image: "🍱", stock: 100 },
        { name: "COMBO 3 (Full Broast, 4 Bun, 4 Sauce, 1.5L Drink, Fries)", price: 2450, cost: 0, sku: "COMBO-3", category: "Arabic Broast", image: "🍱", stock: 100 },
        { name: "COMBO 4 (Jumbo Pizza, 1 Kukkar, 4 Bun, 4 Sauce, 1.5L Drink, Fries)", price: 3500, cost: 0, sku: "COMBO-4", category: "Arabic Broast", image: "🍱", stock: 100 },
        // Beverages
        { name: "Next Cola / Fizz Up 345 ml", price: 80, cost: 0, sku: "DRINK-345", category: "Beverages", image: "", stock: 100 },
        { name: "Next Cola / Fizz Up 500 ml", price: 120, cost: 0, sku: "DRINK-500", category: "Beverages", image: "", stock: 100 },
        { name: "Next Cola / Fizz Up 1 liter", price: 150, cost: 0, sku: "DRINK-1L", category: "Beverages", image: "", stock: 100 },
        { name: "Next Cola / KababJees 1.5 liter", price: 200, cost: 0, sku: "DRINK-1.5L", category: "Beverages", image: "", stock: 100 },
        { name: "Next Cola / Fizz Up Jumbo", price: 250, cost: 0, sku: "DRINK-JUMBO", category: "Beverages", image: "", stock: 100 },
        { name: "Sting 500 ml", price: 130, cost: 0, sku: "DRINK-STING", category: "Beverages", image: "", stock: 100 },
        { name: "Mineral Water Small", price: 50, cost: 0, sku: "WATER-S", category: "Beverages", image: "", stock: 100 },
        { name: "Mineral Water Large", price: 100, cost: 0, sku: "WATER-L", category: "Beverages", image: "", stock: 100 },
        // ALA CART Items
        { name: "Club Sandwich", price: 400, cost: 0, sku: "ALC-CLUB-S", category: "ALA CART", image: "🥪", stock: 100 },
        { name: "Malai Boti Sandwich", price: 450, cost: 0, sku: "ALC-MALAI-S", category: "ALA CART", image: "🥪", stock: 100 },
        { name: "Mexican Sandwich", price: 500, cost: 0, sku: "ALC-MEX-S", category: "ALA CART", image: "🥪", stock: 100 },
        { name: "Spring Rolls 4 Pcs", price: 400, cost: 0, sku: "ALC-ROLLS-4", category: "ALA CART", image: "🌯", stock: 100 },
        { name: "Macroni Pasta Large", price: 650, cost: 0, sku: "ALC-MAC-L", category: "ALA CART", image: "🍝", stock: 100 },
        { name: "Macroni Pasta Small", price: 350, cost: 0, sku: "ALC-MAC-S", category: "ALA CART", image: "🍝", stock: 100 },
        { name: "Oven Backed Wings 6Pcs", price: 350, cost: 0, sku: "ALC-OBW-6", category: "ALA CART", image: "🍗", stock: 100 },
        { name: "Oven Backed Wings 12Pcs", price: 650, cost: 0, sku: "ALC-OBW-12", category: "ALA CART", image: "🍗", stock: 100 },
        { name: "Crispy Wings 6Pcs", price: 350, cost: 0, sku: "ALC-CW-6", category: "ALA CART", image: "🍗", stock: 100 },
        { name: "Crispy Wings 12Pcs", price: 650, cost: 0, sku: "ALC-CW-12", category: "ALA CART", image: "🍗", stock: 100 },
        { name: "Hotshot 10Pcs", price: 450, cost: 0, sku: "ALC-HS-10", category: "ALA CART", image: "🍿", stock: 100 },
        { name: "Hotshot 5Pcs", price: 250, cost: 0, sku: "ALC-HS-5", category: "ALA CART", image: "🍿", stock: 100 },
        // Snacks (Fries)
        { name: "Plain Fries", price: 150, cost: 0, sku: "SNK-FRIES-P", category: "Snacks", image: "", stock: 100 },
        { name: "Masala Fries", price: 170, cost: 0, sku: "SNK-FRIES-M", category: "Snacks", image: "", stock: 100 },
        { name: "Garlic Mayo Fries", price: 200, cost: 0, sku: "SNK-FRIES-GM", category: "Snacks", image: "", stock: 100 },
        { name: "Loaded Fries", price: 300, cost: 0, sku: "SNK-FRIES-L", category: "Snacks", image: "", stock: 100 },
        { name: "Pizza Loaded Fries Small", price: 250, cost: 0, sku: "SNK-FRIES-PLS", category: "Snacks", image: "", stock: 100 },
        { name: "Pizza Loaded Fries Large", price: 450, cost: 0, sku: "SNK-FRIES-PLL", category: "Snacks", image: "", stock: 100 }
      ];

      try {
        // 1. Handle Categories
        const { data: existingCats } = await supabase.from('categories').select('name');
        const existingCatNames = new Set(existingCats?.map(c => c.name) || []);
        const categoryNames = [...new Set(items.map(i => i.category))];

        for (const catName of categoryNames) {
          if (!existingCatNames.has(catName)) {
            await supabase.from('categories').insert({ name: catName, icon: 'Utensils' });
          }
        }

        // 2. Handle Products
        const { data: existingProds } = await supabase.from('products').select('name');
        const existingProdNames = new Set(existingProds?.map(p => p.name) || []);
        const newItems = items.filter(item => !existingProdNames.has(item.name));

        if (newItems.length > 0) {
          const { error: prodError } = await supabase.from('products').insert(newItems as any);
          if (prodError) throw prodError;
        }

        return true;
      } catch (error) {
        console.error('Error seeding products:', error);
        throw error;
      }
    },
    getAll: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as any[];
    },
    create: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, product: ProductUpdate) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    uploadImage: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
    getWithDetails: async () => {
      // Missing tables fix: Only fetch products, ignore variants/addons
      const { data, error } = await supabase
        .from('products')
        .select('*') // Removed '*, product_variants(*), product_addons(*)'
        .order('name');

      if (error) throw error;
      return data;
    }
  },
  addons: {
    getAll: async () => {
      // Missing table fix: Return empty array immediately
      return [] as ProductAddon[];
    },
    create: async (addon: Omit<ProductAddon, 'id' | 'created_at'>) => {
      // Mock implementation or throw error
      throw new Error("Addons table not implemented");
    },
    delete: async (id: string) => {
      throw new Error("Addons table not implemented");
    }
  },
  kitchens: {
    getAll: async () => {
      // Missing table fix: Return empty array immediately
      return [] as Kitchen[];
    },
    create: async (name: string) => {
      throw new Error("Kitchens table not implemented");
    }
  },
  customers: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    create: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: number, customer: CustomerUpdate) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('customer_id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: number) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customer_id', id);
      if (error) throw error;
    }
  },
  tables: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number');
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: number, status: 'available' | 'occupied' | 'reserved' | 'cleaning') => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ status })
        .eq('table_id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    clearReserved: async () => {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('status', 'reserved');
      if (error) throw error;
    }
  },
  orders: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getByIdWithItems: async (id: string) => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, phone, email),
          restaurant_tables(table_number),
          order_items(
            *,
            products(id, name, price, image, category, cost, stock)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    getDailyCount: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      if (error) {
        console.error('Error fetching daily order count:', error);
        return 0;
      }

      return count || 0;
    },
    create: async (order: any, items: OrderItemInsert[]) => {
      // Clean order data to match actual Supabase schema
      const safeOrder: any = {
        total_amount: Number(order.total_amount) || 0,
        status: order.status || 'completed',
        payment_method: order.payment_method || 'cash',
        order_type: order.order_type || 'dine_in',
      };

      if (order.server_name) {
        safeOrder.server_name = order.server_name;
      }

      // Handle customer_id as number if it's an integer-like string or number
      if (order.customer_id) {
        const cid = parseInt(String(order.customer_id));
        if (!isNaN(cid)) {
          safeOrder.customer_id = cid;
        }
      }

      // Handle table_id if present
      if (order.table_id) {
        const tid = parseInt(String(order.table_id));
        if (!isNaN(tid)) {
          safeOrder.table_id = tid;
        }
      }

      // Validate safeOrder object before inserting
      if (!safeOrder.total_amount || typeof safeOrder.total_amount !== 'number') {
        throw new Error('Invalid or missing total_amount');
      }
      if (!safeOrder.payment_method || typeof safeOrder.payment_method !== 'string') {
        throw new Error('Invalid or missing payment_method');
      }

      console.log("Validated safeOrder object for Supabase insertion:", safeOrder);

      // Attempt to insert order into Supabase
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(safeOrder)
        .select()
        .single();

      if (orderError) {
        console.error("Supabase Order Insert Error:", {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
          payload: safeOrder
        });
        throw orderError;
      }
      if (!newOrder) throw new Error('Failed to create order');

      const itemsWithOrderIdFull = items.map(item => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const digitsOnly = /^\d+$/;
        const candidate = (item as any).product_id;
        const dbItem: any = {
          order_id: newOrder.id,
          quantity: item.quantity,
          price: item.price,
          product_name: (item as any).product_name,
          product_category: (item as any).product_category
        };
        if (candidate != null) {
          if (typeof candidate === 'string' && uuidRegex.test(candidate)) {
            dbItem.product_id = candidate;
          } else if ((typeof candidate === 'string' && digitsOnly.test(candidate)) || typeof candidate === 'number') {
            const n = typeof candidate === 'number' ? candidate : parseInt(candidate, 10);
            if (!Number.isNaN(n)) dbItem.product_id = n as any;
          }
        }
        return dbItem;
      });

      // Try inserting with product_name/category; if columns don't exist, fallback to minimal shape
      const { error: firstTryError } = await supabase
        .from('order_items')
        .insert(itemsWithOrderIdFull);

      if (firstTryError) {
        console.warn("Enhanced tracking columns (product_name/category) missing in DB. Falling back to basic storage.");
        // Fallback without product_name/category
        const itemsWithOrderId = itemsWithOrderIdFull.map(({ product_name, product_category, ...rest }) => rest);
        const { error: fallbackError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);
        if (fallbackError) {
          throw fallbackError;
        }
      }
      return newOrder;
    },
    update: async (orderId: string, order: any, items: OrderItemInsert[]) => {
      // Clean order data to match actual Supabase schema
      const safeOrder: any = {
        total_amount: Number(order.total_amount) || 0,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'cash',
        order_type: order.order_type || 'dine_in',
      };

      if (order.server_name) {
        safeOrder.server_name = order.server_name;
      }

      if (order.customer_id) {
        const cid = parseInt(String(order.customer_id));
        if (!isNaN(cid)) safeOrder.customer_id = cid;
      }

      if (order.table_id) {
        const tid = parseInt(String(order.table_id));
        if (!isNaN(tid)) safeOrder.table_id = tid;
      }

      // 1. Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update(safeOrder)
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Delete existing items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) throw deleteError;

      // 3. Insert new items
      const itemsWithOrderIdFull = items.map(item => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const digitsOnly = /^\d+$/;
        const candidate = (item as any).product_id;
        const dbItem: any = {
          order_id: orderId,
          quantity: item.quantity,
          price: item.price,
          product_name: (item as any).product_name,
          product_category: (item as any).product_category
        };
        if (candidate != null) {
          if (typeof candidate === 'string' && uuidRegex.test(candidate)) {
            dbItem.product_id = candidate;
          } else if ((typeof candidate === 'string' && digitsOnly.test(candidate)) || typeof candidate === 'number') {
            const n = typeof candidate === 'number' ? candidate : parseInt(candidate, 10);
            if (!Number.isNaN(n)) dbItem.product_id = n as any;
          }
        }
        return dbItem;
      });

      // Insert new items with strict snapshotting
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsWithOrderIdFull);

      if (itemsError) throw itemsError;
      return true;
    },
    getOngoing: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, phone),
          restaurant_tables(table_number),
          order_items(
            *,
            products(name, image)
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    updateStatus: async (id: string, status: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      // 1. Delete associated order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // 2. Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (orderError) throw orderError;
      return true;
    },
    clearAllToday: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startOfDay.toISOString());

      if (fetchError) throw fetchError;
      if (!orders || orders.length === 0) return;

      const orderIds = orders.map(o => o.id);

      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Delete orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (ordersError) throw ordersError;
    },
    deleteTodayOrders: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // 1. Get IDs of orders to delete
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startOfDay.toISOString());

      if (fetchError) throw fetchError;

      if (!orders || orders.length === 0) return;

      const orderIds = orders.map(o => (o as any).id);

      // 2. Delete associated order items first (Manual Cascade)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // 3. Delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (ordersError) throw ordersError;
    },
    deleteAllOrders: async () => {
      // 1. Delete ALL order items first (Manual Cascade)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (itemsError) throw itemsError;

      // 2. Delete ALL orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (ordersError) throw ordersError;
    }
  },
  reports: {
    getDashboardStats: async () => {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      return {
        orders: orders || [],
        customers: customers || []
      };
    }
  },
  profiles: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
    getByRestaurant: async (restaurantId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
    update: async (id: string, profile: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    changePassword: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    }
  }
};
