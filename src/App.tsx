import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import OngoingOrdersPage from "./pages/OngoingOrdersPage";
import OrdersPage from "./pages/OrdersPage";
import ManageProductsPage from "./pages/ManageProductsPage";
import ProductsPage from "./pages/ProductsPage";
import CustomersPage from "./pages/CustomersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import Welcome from "./pages/Welcome";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import LicenseGenerator from "./pages/LicenseGenerator";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { LicenseGate } from "./components/LicenseGate";
import { useMultiTenant } from "./hooks/useMultiTenant";

const queryClient = new QueryClient();

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
        <Routes>
            <Route path="/license-manager" element={<LicenseGenerator />} />
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
              <ProtectedRoute>
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
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Welcome />} />
            <Route path="/login" element={<LoginPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
