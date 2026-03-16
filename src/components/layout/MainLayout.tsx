import { ReactNode, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import AppSidebar from './AppSidebar';
import StartDayModal from '@/components/pos/StartDayModal';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { restaurant } = useMultiTenant();
  const [showStartDayModal, setShowStartDayModal] = useState(false);
  const [showLicenseBanner, setShowLicenseBanner] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  const expiryInfo = useMemo(() => {
    if (!restaurant?.license_expiry) return null;
    const days = differenceInDays(parseISO(restaurant.license_expiry), new Date());
    return {
      days,
      isExpiringSoon: days >= 0 && days <= 7,
      isExpired: days < 0
    };
  }, [restaurant]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Check for an open register
  const { data: openRegister, isLoading } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    // If not loading and no open register found, show the modal
    if (!isLoading && openRegister === null) {
      setShowStartDayModal(true);
    } else {
      setShowStartDayModal(false);
    }
  }, [openRegister, isLoading]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showLicenseBanner && expiryInfo?.isExpiringSoon && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-black font-heading uppercase tracking-widest">
                License Alert: Your subscription expires in {expiryInfo.days} days. Please renew to avoid service interruption.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Contact: +92 334 2826675</p>
              <button onClick={() => setShowLicenseBanner(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      
      <StartDayModal 
        isOpen={showStartDayModal} 
        onSuccess={() => setShowStartDayModal(false)} 
      />
    </div>
  );
};

export default MainLayout;
