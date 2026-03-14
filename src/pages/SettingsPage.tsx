import { Store, Receipt, Users, CreditCard, Bell, Shield, Lock, Trash2, Edit, Image as ImageIcon, Upload } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SettingsPage = () => {
  const { profile, restaurant, isAdmin } = useMultiTenant();
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [businessName, setBusinessName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [city, setCity] = useState(restaurant?.city || '');
  const [taxId, setTaxId] = useState(restaurant?.tax_id || '');
  const [website, setWebsite] = useState(restaurant?.website || '');
  const [email, setEmail] = useState(restaurant?.email || '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '');
  const [receiptFooter, setReceiptFooter] = useState(restaurant?.receipt_footer || 'Thank you for your visit! Come back soon!');
  const [billFooter, setBillFooter] = useState(restaurant?.bill_footer || '!!!!FOR THE LOVE OF FOOD !!!!');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (restaurant) {
      setBusinessName(restaurant.name || '');
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setCity(restaurant.city || '');
      setTaxId(restaurant.tax_id || '');
      setWebsite(restaurant.website || '');
      setEmail(restaurant.email || '');
      setLogoUrl(restaurant.logo_url || '');
      setReceiptFooter(restaurant.receipt_footer || 'Thank you for your visit! Come back soon!');
      setBillFooter(restaurant.bill_footer || '!!!!FOR THE LOVE OF FOOD !!!!');
    }
  }, [restaurant]);

  const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', restaurant?.id],
    queryFn: () => api.profiles.getByRestaurant(restaurant!.id),
    enabled: !!restaurant?.id && isAdmin,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (pwd: string) => api.profiles.changePassword(pwd),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate(newPassword);
  };

  const updateRestaurantMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!restaurant?.id) throw new Error('No restaurant selected');
      const { error } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Restaurant settings updated');
      if (restaurant?.id) {
        queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update restaurant settings');
    },
  });

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!restaurant?.id) {
      toast.error('No restaurant selected');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        toast.error('Failed to upload logo');
        return;
      }

      const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) {
        toast.error('Could not get logo URL');
        return;
      }

      setLogoUrl(data.publicUrl);
      updateRestaurantMutation.mutate({ logo_url: data.publicUrl });
    } catch (error: any) {
      console.error('Logo upload exception:', error);
      toast.error(error.message || 'Unexpected error while uploading logo');
    } finally {
      setIsUploadingLogo(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your POS system configuration</p>
          </div>

          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="tax">Tax & Payment</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              {isAdmin && <TabsTrigger value="staff">Staff</TabsTrigger>}
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Update your restaurant details that appear on receipts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City & State</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={() =>
                        updateRestaurantMutation.mutate({
                          name: businessName,
                          phone,
                          address,
                          city,
                          tax_id: taxId,
                          website,
                          email,
                        })
                      }
                      disabled={updateRestaurantMutation.isPending}
                    >
                      {updateRestaurantMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receipt">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how your receipts look and print
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Logo URL
                      </Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://your-cdn.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This image will appear on printed bills and receipts. You can also upload a file.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploadingLogo ? 'Uploading…' : 'Upload Logo'}
                        </Button>
                        {logoUrl && (
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {logoUrl}
                          </span>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-print receipts</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically print when order is completed
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show QR code</p>
                        <p className="text-sm text-muted-foreground">
                          Display QR code for digital receipt
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Include customer info</p>
                        <p className="text-sm text-muted-foreground">
                          Print customer name and phone on receipt
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Footer Message</Label>
                    <Input
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bill Footer (Kitchen / 80mm)</Label>
                    <Input
                      value={billFooter}
                      onChange={(e) => setBillFooter(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      onClick={() =>
                        updateRestaurantMutation.mutate({
                          logo_url: logoUrl || null,
                          receipt_footer: receiptFooter,
                          bill_footer: billFooter,
                        })
                      }
                      disabled={updateRestaurantMutation.isPending}
                    >
                      {updateRestaurantMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Tax & Payment Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tax rates and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input id="taxRate" type="number" defaultValue="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxName">Tax Name</Label>
                      <Input id="taxName" defaultValue="Sales Tax" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Enabled Payment Methods</h3>
                    
                    <div className="flex items-center justify-between">
                      <p>Cash</p>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p>Credit/Debit Card</p>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p>Digital Wallet (Apple Pay, Google Pay)</p>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Low stock alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when products are running low
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Daily sales summary</p>
                        <p className="text-sm text-muted-foreground">
                          Receive daily sales report via email
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sound notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Play sounds for order completions
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                    <Input id="lowStockThreshold" type="number" defaultValue="10" />
                    <p className="text-sm text-muted-foreground">
                      Alert when stock falls below this number
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Management
                  </CardTitle>
                  <CardDescription>
                    Manage employees and their access roles for {restaurant?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="divide-y border rounded-xl overflow-hidden">
                      {staffMembers.map((member) => (
                        <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase">
                              {member.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{member.full_name || 'Unnamed User'}</p>
                              <p className="text-xs text-slate-500 font-medium">{member.role} • Active</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {profile?.id !== member.id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                      Invite New Staff Member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Keep your account secure by changing your password regularly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Min. 6 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </MainLayout>
  );
};

export default SettingsPage;
