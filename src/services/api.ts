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

const getRestaurantId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('restaurant_id')
    .eq('id', session.user.id)
    .single();
  return profile?.restaurant_id || null;
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
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return null;

      const { data, error } = await supabase
        .from('daily_registers' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      return data as DailyRegister | null;
    },
    start: async (startingAmount: number, openedAt?: string) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_registers' as any)
        .insert({
          starting_amount: startingAmount,
          status: 'open',
          opened_at: openedAt || new Date().toISOString(),
          restaurant_id: restaurantId
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
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    create: async (category: Omit<Category, 'id'>) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, restaurant_id: restaurantId })
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
    seedMenu: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const items = [
        // Arabic Broast
        { name: "Skin Spicy Injected Full Kukkar", price: 2000, cost: 0, sku: "SIB-FULL-K", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Broast Leg/Thai 2Pcs", price: 600, cost: 0, sku: "SIB-LT-2", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Broast Chest/Wing 2Pcs", price: 600, cost: 0, sku: "SIB-CW-2", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Half Broast 4Pcs", price: 1100, cost: 0, sku: "SIB-HALF-4", category: "Arabic Broast", image: "🍗", stock: 100 },
        { name: "Skin Spicy injected Full Broast 8Pcs", price: 2200, cost: 0, sku: "SIB-FULL-8", category: "Arabic Broast", image: "🍗", stock: 100 },
        // Beverages
        { name: "Next Cola / Fizz Up 345 ml", price: 80, cost: 0, sku: "DRINK-345", category: "Beverages", image: "🥤", stock: 100 },
        { name: "Mineral Water Small", price: 50, cost: 0, sku: "WATER-S", category: "Beverages", image: "💧", stock: 100 },
        // ALA CART
        { name: "Club Sandwich", price: 400, cost: 0, sku: "ALC-CLUB-S", category: "ALA CART", image: "🥪", stock: 100 },
        { name: "Crispy Wings 6Pcs", price: 350, cost: 0, sku: "ALC-CW-6", category: "ALA CART", image: "🍗", stock: 100 }
      ];

      try {
        // 1. Handle Categories
        const categoryNames = [...new Set(items.map(i => i.category))];
        for (const catName of categoryNames) {
          const { data: existingCat } = await supabase
            .from('categories')
            .select('id')
            .eq('name', catName)
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

          if (!existingCat) {
            await api.categories.create({ name: catName, icon: 'Utensils' });
          }
        }

        // 2. Handle Products
        for (const item of items) {
          const { data: existingProd } = await supabase
            .from('products')
            .select('id')
            .eq('name', item.name)
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

          if (!existingProd) {
            await api.products.create(item);
          }
        }

        return true;
      } catch (error) {
        console.error('Error seeding products:', error);
        throw error;
      }
    },
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    getWithDetails: async (productId: string) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (error) throw error;
      return { ...data, variants: [], addons: [] };
    },
    create: async (product: ProductInsert) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, product: ProductUpdate) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
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
    }
  },
  addons: {
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('product_addons' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      
      if (error && error.code !== 'PGRST116') throw error;
      return (data || []) as ProductAddon[];
    },
    create: async (addon: Omit<ProductAddon, 'id' | 'created_at'>) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('product_addons' as any)
        .insert({ ...addon, restaurant_id: restaurantId })
        .select()
        .single();
      
      if (error) throw error;
      return data as ProductAddon;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('product_addons' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  kitchens: {
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('kitchens' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      
      if (error && error.code !== 'PGRST116') throw error;
      return (data || []) as Kitchen[];
    },
    create: async (name: string) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('kitchens' as any)
        .insert({ name, restaurant_id: restaurantId })
        .select()
        .single();
      
      if (error) throw error;
      return data as Kitchen;
    }
  },
  customers: {
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return data;
    },
    create: async (customer: CustomerInsert) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          restaurant_id: restaurantId
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, customer: CustomerUpdate) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  tables: {
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number');
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: string, status: 'available' | 'occupied' | 'reserved' | 'cleaning') => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    clearReserved: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return;

      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('status', 'reserved')
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    }
  },
  orders: {
    getAll: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getByIdWithItems: async (id: string) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

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
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
    getDailyCount: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return 0;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startOfDay.toISOString());

      if (error) {
        console.error('Error fetching daily order count:', error);
        return 0;
      }

      return count || 0;
    },
    create: async (order: any, items: OrderItemInsert[]) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const safeOrder: any = {
        total_amount: Number(order.total_amount) || 0,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'cash',
        order_type: order.order_type || 'dine_in',
        restaurant_id: restaurantId,
        customer_id: order.customer_id || null,
        table_id: order.table_id || null
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(safeOrder)
        .select()
        .single();

      if (orderError) throw orderError;
      if (!newOrder) throw new Error('Failed to create order');

      const itemsToInsert = items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        restaurant_id: restaurantId
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
      return newOrder;
    },
    update: async (orderId: string, order: any, items: OrderItemInsert[]) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const safeOrder: any = {
        total_amount: Number(order.total_amount) || 0,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'cash',
        order_type: order.order_type || 'dine_in',
        customer_id: order.customer_id || null,
        table_id: order.table_id || null
      };

      const { error: orderError } = await supabase
        .from('orders')
        .update(safeOrder)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

      if (orderError) throw orderError;

      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) throw deleteError;

      const itemsToInsert = items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        restaurant_id: restaurantId
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
      return true;
    },
    getOngoing: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return [];

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
        .eq('restaurant_id', restaurantId)
        .neq('status', 'completed')
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
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (orderError) throw orderError;
      return true;
    },
    clearAllToday: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) return;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startOfDay.toISOString());

      if (!orders || orders.length === 0) return;

      const orderIds = orders.map(o => o.id);

      await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

      await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
    }
  },
  reports: {
    getDashboardStats: async () => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (customersError) throw customersError;

      const totalRevenue = (orders as any[]).reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const totalOrders = orders?.length || 0;
      const totalCustomers = customers?.length || 0;
      
      return {
        revenue: totalRevenue,
        orders: totalOrders,
        customers: totalCustomers,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        recentOrders: (orders as any[]).slice(0, 5)
      };
    },
    getSalesReport: async (startDate: Date, endDate: Date) => {
      const restaurantId = await getRestaurantId();
      if (!restaurantId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  },
  profiles: {
    get: async (id: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, profile: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};
