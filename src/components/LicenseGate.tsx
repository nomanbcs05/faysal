
import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { licenseService, LicenseData } from "@/services/licenseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export const LicenseGate = ({ children }: { children?: React.ReactNode }) => {
  const { restaurant, isLoading, session, profile } = useMultiTenant();
  const [isValid, setIsValid] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      checkSubscription();
    }
  }, [isLoading, restaurant, session, profile]);

  const checkSubscription = () => {
    // 1. If not logged in, allow access to Auth pages
    if (!session) {
      setIsValid(true);
      setChecking(false);
      return;
    }

    // 2. Super Admin always has access
    if (profile?.role === 'super-admin') {
      setIsValid(true);
      setChecking(false);
      return;
    }

    // 3. Check Database Subscription Status
    if (restaurant) {
      const isSubscriptionActive = restaurant.subscription_status === 'active' || restaurant.subscription_status === 'trial';
      
      // Also check expiry date if present
      if (isSubscriptionActive && restaurant.license_expiry) {
        const expiry = new Date(restaurant.license_expiry);
        if (expiry < new Date()) {
          setIsValid(false);
          setChecking(false);
          return;
        }
      }

      setIsValid(isSubscriptionActive);
    } else {
      // If logged in but no restaurant, we should block access to POS pages
      setIsValid(false);
    }
    
    setChecking(false);
  };

  /*
  if (isLoading || checking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="font-black font-heading uppercase tracking-widest text-xs">Verifying Subscription...</p>
      </div>
    );
  }
  */

  // REMOVED ALL LICENSE GATE RESTRICTIONS - ALWAYS ALLOW ACCESS
  return <>{children || <Outlet />}</>;

  /*
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <Card className="w-full max-w-md border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
        <CardHeader className="text-center p-8 bg-slate-800/50">
          <div className="mx-auto bg-red-500/20 p-4 rounded-2xl w-fit mb-6 rotate-3 shadow-lg shadow-red-500/10">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-black font-heading uppercase tracking-tight">Access Suspended</CardTitle>
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
            Your restaurant subscription has expired
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Subscription for "{restaurant?.name}" is no longer active.
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed text-center font-medium">
              Please contact your system administrator or reach out to support to renew your monthly rental license.
            </p>
            
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-center">
              <p className="text-[10px] font-black font-heading uppercase tracking-widest text-slate-500 mb-1">Support Contact</p>
              <p className="text-blue-400 font-bold text-lg">+92 334 2826675</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 font-black font-heading uppercase tracking-widest"
            onClick={() => window.location.reload()}
          >
            Check Status Again
          </Button>

          <div className="text-center text-[10px] font-black font-heading uppercase tracking-widest text-slate-600 mt-4">
            Powered By GENAI TECHNOLOGY
          </div>
        </CardContent>
      </Card>
    </div>
  );
  */
};
