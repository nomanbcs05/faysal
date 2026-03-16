import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { LicenseGate } from "./components/LicenseGate";
import { useMultiTenant } from "./hooks/useMultiTenant";
import { Loader2 } from "lucide-react";

// Lazy load pages to prevent initialization errors and improve performance
const Index = lazy(() => import("./pages/Index"));
const OngoingOrdersPage = lazy(() => import("./pages/OngoingOrdersPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const ManageProductsPage = lazy(() => import("./pages/ManageProductsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Welcome = lazy(() => import("./pages/Welcome"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LicenseGenerator = lazy(() => import("./pages/LicenseGenerator"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-950">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const HomeRoute = () => {
  const { isSuperAdmin } = useMultiTenant();

  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
              <Route path="/license-manager" element={
                <ProtectedRoute adminOnly>
                  <LicenseGenerator />
                </ProtectedRoute>
              } />
              <Route path="/super-admin" element={
                <ProtectedRoute adminOnly>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } />

              {/* Secured Application Routes */}
            <Route element={<LicenseGate />}>
              <Route path="/" element={
                <ProtectedRoute>
                  <HomeRoute />
                </ProtectedRoute>
              } />
              <Route path="/ongoing-orders" element={
                <ProtectedRoute>
                  <OngoingOrdersPage />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } />
              <Route path="/manage-products" element={
                <ProtectedRoute adminOnly>
                  <ManageProductsPage />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute adminOnly>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute adminOnly>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Welcome />} />
              <Route path="/login" element={<LoginPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
