import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Home, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const SuperAdminLayout = ({ children, title = 'Admin Panel', subtitle }: SuperAdminLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to logout');
    } else {
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black font-heading uppercase tracking-tight text-white">
                🔐 {title}
              </h1>
              {subtitle && (
                <p className="text-slate-400 font-medium text-xs mt-1">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={handleGoHome}
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <div className="h-8 w-px bg-slate-600" />
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-4">
          <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            GenXCloud POS • Super Admin Panel v2.0
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SuperAdminLayout;
