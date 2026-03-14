import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  restaurant_id: string | null;
  full_name: string | null;
  role: 'admin' | 'cashier' | 'super-admin';
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  license_expiry: string | null;
  // Optional branding & business fields (may be null if not set)
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  website?: string | null;
  email?: string | null;
  logo_url?: string | null;
  receipt_footer?: string | null;
  bill_footer?: string | null;
}

export const useMultiTenant = () => {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error fetching session:", error);
        toast.error("Session error. Please log in again.");
      }
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change in hook:", event, session?.user?.email);
      if (event === "SIGNED_OUT" || !session) {
        setSession(null);
        setSessionLoading(false);
        return;
      }
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile detail:', error);
        if (error.code === '406') {
          toast.error('Profile not found or request not acceptable. Please contact support.');
        } else {
          toast.error('An error occurred while fetching the profile.');
        }
        return null;
      }
      console.log("Profile loaded successfully:", data.id);
      return data as Profile;
    },
    enabled: !!session?.user?.id,
  });

  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant', profile?.restaurant_id],
    queryFn: async () => {
      if (!profile?.restaurant_id) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single();

      if (error) {
        console.error('Error fetching restaurant:', error);
        return null;
      }
      return data as Restaurant;
    },
    enabled: !!profile?.restaurant_id,
  });

  return {
    session,
    profile,
    restaurant,
    isLoading: sessionLoading || profileLoading || restaurantLoading,
    isSuperAdmin: profile?.role === 'super-admin',
    isAdmin: profile?.role === 'admin' || profile?.role === 'super-admin',
  };
};
