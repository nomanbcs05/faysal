
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseSignup } from '@/integrations/supabase/supabaseAdmin';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Users, Building2, Calendar, ShieldCheck, Mail, Lock, UserPlus,
  Search, Power, PowerOff, Clock, TrendingUp, Store, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, RotateCcw, Eye, CalendarPlus, DollarSign,
  Trash2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useCallback } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMultiTenant } from '@/hooks/useMultiTenant';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  subscription_status: string;
  license_expiry: string | null;
  created_at: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useMultiTenant();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');

  const ACCESS_PASSWORD = import.meta.env.VITE_SUPER_ADMIN_ACCESS_PASSWORD || 'genxcloud-pos-admin';

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newRestaurantSlug, setNewRestaurantSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Track individual button loading states
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['super-admin-restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Restaurant[];
    },
  });

  // ─── Computed Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter(r => r.subscription_status === 'active').length;
    const trial = restaurants.filter(r => r.subscription_status === 'trial').length;
    const expired = restaurants.filter(r => r.subscription_status === 'expired' || r.subscription_status === 'suspended').length;
    const expiringIn7Days = restaurants.filter(r => {
      if (!r.license_expiry) return false;
      const days = differenceInDays(new Date(r.license_expiry), new Date());
      return days >= 0 && days <= 7;
    }).length;
    return { total, active, trial, expired, expiringIn7Days };
  }, [restaurants]);

  // ─── Filtered Restaurants ───────────────────────────────────────────────
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.subscription_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [restaurants, searchQuery, statusFilter]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const createAccountMutation = useMutation({
    mutationFn: async ({ name, slug, email, password, fullName }: {
      name: string; slug: string; email: string; password: string; fullName: string;
    }) => {
      // Validate inputs
      if (!name?.trim() || !slug?.trim() || !email?.trim() || !password?.trim() || !fullName?.trim()) {
        throw new Error('All fields are required');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      if (!email.includes('@')) {
        throw new Error('Invalid email address');
      }

      const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw new Error(`Auth: ${authError.message}`);
      if (!authData.user) throw new Error('Email may already be registered.');

      const userId = authData.user.id;

      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .insert([{
          name,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          owner_id: userId,
          subscription_status: 'trial',
          license_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();
      if (restError) throw new Error(`Restaurant: ${restError.message}`);

      const { error: profileError } = await supabaseSignup
        .from('profiles')
        .upsert({ id: userId, restaurant_id: restaurant.id, full_name: fullName, email, role: 'admin' });
      if (profileError) throw new Error(`Profile: ${profileError.message}`);

      return restaurant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      setNewRestaurantName(''); setNewRestaurantSlug('');
      setOwnerEmail(''); setOwnerPassword(''); setOwnerFullName('');
      setShowCreateForm(false);
      toast.success(`Restaurant "${data.name}" created successfully! Owner can now log in.`);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to create restaurant account';
      toast.error(message);
      console.error('Create account error:', error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, expiry }: { id: string; status: string; expiry?: string }) => {
      if (!id) throw new Error('Restaurant ID is required');
      if (!status) throw new Error('Status is required');
      
      const update: any = { subscription_status: status };
      if (expiry) update.license_expiry = expiry;
      
      const { error } = await supabase.from('restaurants').update(update).eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      toast.success(`Restaurant status updated to ${data.status}`);
      setLoadingStates(prev => ({ ...prev, [data.id]: false }));
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
      console.error('Update status error:', error);
      setLoadingStates({});
    },
  });

  const viewDataMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      if (!session?.user?.id) throw new Error('No active session');

      const { error } = await supabase
        .from('profiles')
        .update({ restaurant_id: restaurantId })
        .eq('id', session.user.id);
      
      if (error) throw error;
      return restaurantId;
    },
    onSuccess: () => {
      toast.success('Switched to restaurant context');
      // Wait a moment for the profile update to propagate
      setTimeout(() => {
        navigate('/');
      }, 500);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to switch restaurant context');
      console.error('View data error:', error);
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');

      // Delete tenant data first to avoid foreign key issues
      const tables = [
        'order_items',
        'orders',
        'customers',
        'products',
        'categories',
        'daily_registers',
        'restaurant_tables',
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('restaurant_id', restaurantId as any);
        if (error) {
          console.error(`Failed deleting from ${table}`, error);
          throw new Error(`Failed to delete ${table} for restaurant`);
        }
      }

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

      if (restaurantError) {
        console.error('Failed deleting restaurant', restaurantError);
        throw new Error('Failed to delete restaurant');
      }

      return restaurantId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-restaurants'] });
      setLoadingStates(prev => {
        const copy = { ...prev };
        delete copy[`delete-${id}`];
        return copy;
      });
      toast.success('Restaurant and all related data deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete restaurant');
      setLoadingStates(prev => {
        // Clear all delete loading states
        const copy = { ...prev };
        Object.keys(copy).forEach(key => {
          if (key.startsWith('delete-')) delete copy[key];
        });
        return copy;
      });
    },
  });

  // ─── Button Handlers ───────────────────────────────────────────────────
  const handleActivate = useCallback((restaurantId: string) => {
    setLoadingStates(prev => ({ ...prev, [`activate-${restaurantId}`]: true }));
    updateStatusMutation.mutate({
      id: restaurantId,
      status: 'active',
      expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    });
  }, [updateStatusMutation]);

  const handleSuspend = useCallback((restaurantId: string) => {
    setLoadingStates(prev => ({ ...prev, [`suspend-${restaurantId}`]: true }));
    updateStatusMutation.mutate({ id: restaurantId, status: 'suspended' });
  }, [updateStatusMutation]);

  const handleExtendDays = useCallback((restaurantId: string, currentExpiry: string | null, days: number = 30) => {
    setLoadingStates(prev => ({ ...prev, [`extend-${restaurantId}`]: true }));
    const base = currentExpiry && new Date(currentExpiry) > new Date() 
      ? new Date(currentExpiry) 
      : new Date();
    const newExpiry = addDays(base, days);
    updateStatusMutation.mutate({
      id: restaurantId,
      status: 'active',
      expiry: newExpiry.toISOString(),
    });
  }, [updateStatusMutation]);

  const handleView = useCallback((restaurantId: string) => {
    setLoadingStates(prev => ({ ...prev, [`view-${restaurantId}`]: true }));
    viewDataMutation.mutate(restaurantId);
  }, [viewDataMutation]);

  const handleDelete = useCallback((restaurant: Restaurant) => {
    if (restaurant.slug === 'default-restaurant') {
      toast.error('Default restaurant cannot be deleted');
      return;
    }
    const confirmed = window.confirm(
      `Delete restaurant "${restaurant.name}" and all its data (orders, products, customers)? This cannot be undone.`
    );
    if (!confirmed) return;
    setLoadingStates(prev => ({ ...prev, [`delete-${restaurant.id}`]: true }));
    deleteRestaurantMutation.mutate(restaurant.id);
  }, [deleteRestaurantMutation]);

  const isFormValid = newRestaurantName && newRestaurantSlug && ownerEmail && ownerPassword.length >= 6 && ownerFullName;

  // ─── Helpers ────────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'trial': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'expired': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'suspended': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const getExpiryInfo = (expiry: string | null) => {
    if (!expiry) return { text: 'No expiry set', color: 'text-slate-400', urgent: false };
    const days = differenceInDays(new Date(expiry), new Date());
    if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: 'text-red-500', urgent: true };
    if (days <= 7) return { text: `${days}d remaining`, color: 'text-amber-500', urgent: true };
    if (days <= 30) return { text: `${days}d remaining`, color: 'text-blue-500', urgent: false };
    return { text: `${days}d remaining`, color: 'text-emerald-500', urgent: false };
  };

  // ─── Local Access Gate ─────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <SuperAdminLayout
        title="Super Admin Login"
        subtitle="Enter the secure access password to manage all restaurants"
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-none bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-blue-950/40 rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black font-heading uppercase tracking-widest text-center text-white flex items-center justify-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                Super Admin Access
              </CardTitle>
              <p className="text-xs text-slate-400 text-center mt-1 font-medium">
                Protected area. Only the owner should know this password.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-300">
                  Access Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter super admin password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className="rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-11"
                />
              </div>
              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-black font-heading uppercase tracking-widest h-11 shadow-lg shadow-blue-500/30 text-xs"
                onClick={() => {
                  if (accessPassword === ACCESS_PASSWORD) {
                    setIsUnlocked(true);
                    setAccessPassword('');
                    toast.success('Super admin area unlocked');
                  } else {
                    toast.error('Invalid super admin password');
                  }
                }}
              >
                Unlock Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </SuperAdminLayout>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <SuperAdminLayout 
      title="Admin Panel"
      subtitle="Central control for all restaurants, subscriptions & services"
    >
      <div className="space-y-6 max-w-[1600px] mx-auto">

        {/* ── New Restaurant Button ─────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 font-black font-heading uppercase tracking-widest text-xs h-10 px-5 shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Hide Form' : 'New Restaurant'}
          </Button>
        </div>

        {/* ── Stats Overview ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Store} label="Total" value={stats.total} color="bg-slate-900" />
          <StatCard icon={CheckCircle} label="Active" value={stats.active} color="bg-emerald-600" />
          <StatCard icon={Clock} label="Trial" value={stats.trial} color="bg-blue-600" />
          <StatCard icon={XCircle} label="Expired" value={stats.expired} color="bg-red-600" />
          <StatCard icon={AlertTriangle} label="Expiring Soon" value={stats.expiringIn7Days} color="bg-amber-500" />
        </div>

        {/* ── Create Account Form (Collapsible) ────────────────────────── */}
        {showCreateForm && (
          <Card className="border-none bg-slate-800/40 backdrop-blur shadow-xl shadow-blue-950/50 rounded-3xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardTitle className="text-sm font-black font-heading uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-100" />
                Register New Restaurant Account
              </CardTitle>
              <p className="text-blue-100 text-xs font-medium mt-1">Create a restaurant with an owner login — they can sign in immediately</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField icon={<Users className="h-4 w-4" />} label="Owner Full Name" placeholder="e.g., Ahmed Khan" value={ownerFullName} onChange={setOwnerFullName} />
                <FormField icon={<Mail className="h-4 w-4" />} label="Owner Email (Login)" placeholder="owner@restaurant.com" value={ownerEmail} onChange={setOwnerEmail} type="email" />
                <FormField icon={<Lock className="h-4 w-4" />} label="Password (min 6)" placeholder="••••••••" value={ownerPassword} onChange={setOwnerPassword} type="password" />
                <FormField icon={<Building2 className="h-4 w-4" />} label="Restaurant Name" placeholder="e.g., Downtown Bistro" value={newRestaurantName} onChange={setNewRestaurantName} />
                <FormField icon={<span className="font-bold text-sm">@</span>} label="Unique Slug" placeholder="downtown-bistro" value={newRestaurantSlug} onChange={setNewRestaurantSlug} />
                <div className="flex items-end">
                  <Button
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-black font-heading uppercase tracking-widest h-11 shadow-lg shadow-blue-500/20 text-xs"
                    onClick={() => createAccountMutation.mutate({ name: newRestaurantName, slug: newRestaurantSlug, email: ownerEmail, password: ownerPassword, fullName: ownerFullName })}
                    disabled={!isFormValid || createAccountMutation.isPending}
                  >
                    {createAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Search & Filter Bar ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by restaurant name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-slate-800/50 border-slate-700 h-11 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'active', 'trial', 'expired', 'suspended'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                className={`rounded-xl text-[10px] font-black font-heading uppercase tracking-widest h-11 px-4 ${
                  statusFilter === status 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? `All (${restaurants.length})` : `${status} (${restaurants.filter(r => r.subscription_status === status).length})`}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Restaurants Table ─────────────────────────────────────────── */}
        <Card className="border-none bg-slate-800/40 backdrop-blur shadow-xl shadow-slate-950/50 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-700">
                  <th className="text-left text-[10px] font-black font-heading uppercase tracking-widest text-slate-300 px-6 py-4">Restaurant</th>
                  <th className="text-left text-[10px] font-black font-heading uppercase tracking-widest text-slate-300 px-4 py-4">Status</th>
                  <th className="text-left text-[10px] font-black font-heading uppercase tracking-widest text-slate-300 px-4 py-4">License Expiry</th>
                  <th className="text-left text-[10px] font-black font-heading uppercase tracking-widest text-slate-300 px-4 py-4">Created</th>
                  <th className="text-right text-[10px] font-black font-heading uppercase tracking-widest text-slate-300 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                      No restaurants found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => {
                    const expiry = getExpiryInfo(restaurant.license_expiry);
                    return (
                      <tr key={restaurant.id} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-700/50 rounded-xl group-hover:bg-blue-900/30 transition-colors">
                              <Building2 className="h-5 w-5 text-slate-400 group-hover:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-black text-white text-sm">{restaurant.name}</p>
                              <p className="text-slate-400 text-xs font-bold">@{restaurant.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${getStatusColor(restaurant.subscription_status)} border px-3 py-1 rounded-full font-bold uppercase text-[10px]`}>
                            {restaurant.subscription_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {expiry.urgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-sm font-bold ${expiry.color}`}>{expiry.text}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 font-medium">
                            {format(new Date(restaurant.created_at), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Activate */}
                            {restaurant.subscription_status !== 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleActivate(restaurant.id)}
                                disabled={loadingStates[`activate-${restaurant.id}`] || updateStatusMutation.isPending}
                              >
                                {loadingStates[`activate-${restaurant.id}`] ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Power className="h-3 w-3 mr-1" />
                                )}
                                Activate
                              </Button>
                            )}

                            {/* Suspend */}
                            {(restaurant.subscription_status === 'active' || restaurant.subscription_status === 'trial') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 px-3 border-amber-200 text-amber-600 hover:bg-amber-50"
                                onClick={() => handleSuspend(restaurant.id)}
                                disabled={loadingStates[`suspend-${restaurant.id}`] || updateStatusMutation.isPending}
                              >
                                {loadingStates[`suspend-${restaurant.id}`] ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <PowerOff className="h-3 w-3 mr-1" />
                                )}
                                Suspend
                              </Button>
                            )}

                            {/* Extend 30 Days */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 px-3 border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleExtendDays(restaurant.id, restaurant.license_expiry)}
                              disabled={loadingStates[`extend-${restaurant.id}`] || updateStatusMutation.isPending}
                            >
                              {loadingStates[`extend-${restaurant.id}`] ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CalendarPlus className="h-3 w-3 mr-1" />
                              )}
                              +30 Days
                            </Button>

                            {/* View Data */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 px-3 border-slate-200 hover:bg-slate-50"
                              onClick={() => handleView(restaurant.id)}
                              disabled={loadingStates[`view-${restaurant.id}`] || viewDataMutation.isPending}
                            >
                              {loadingStates[`view-${restaurant.id}`] ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Eye className="h-3 w-3 mr-1" />
                              )}
                              View
                            </Button>

                            {/* Delete Restaurant */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(restaurant)}
                              disabled={
                                restaurant.slug === 'default-restaurant' ||
                                loadingStates[`delete-${restaurant.id}`] ||
                                deleteRestaurantMutation.isPending
                              }
                            >
                              {loadingStates[`delete-${restaurant.id}`] ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3 mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className={`${color} rounded-2xl p-5 text-white shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/70 text-[10px] font-black font-heading uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
      </div>
      <div className="p-3 bg-white/10 rounded-xl">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const FormField = ({ icon, label, placeholder, value, onChange, type = 'text' }: {
  icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-black font-heading uppercase tracking-widest text-slate-300">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 rounded-xl bg-slate-700/50 border-slate-600 h-11 text-white placeholder:text-slate-500"
      />
    </div>
  </div>
);

export default SuperAdminDashboard;
