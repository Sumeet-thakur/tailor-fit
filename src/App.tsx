import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CustomizationProvider } from "./context/CustomizationContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting (Speed optimization)
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Customize = lazy(() => import("./pages/Customize"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Customize3D = lazy(() => import("./pages/Customize3D"));
const Customize3DLanding = lazy(() => import("./pages/Customize3DLanding"));

// Loading fallback component (Fidelity - proper loading state)
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Optimized QueryClient with caching (Speed + Efficiency)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduces API calls
      gcTime: 10 * 60 * 1000, // 10 minutes - improves speed (formerly cacheTime)
      refetchOnWindowFocus: false, // Prevents unnecessary refetches
      retry: 1, // Faster failure handling
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CustomerAuthProvider>
          <NotificationProvider>
            <ChatProvider>
              <CartProvider>
                <CustomizationProvider>
                  <Toaster />
                  <Sonner position="bottom-right" offset={{ bottom: '80px', right: '16px' }} />
                  <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        <Route path="/customize/:id" element={<Customize />} />
                        <Route path="/3d-customizer" element={<Customize3DLanding />} />
                        <Route path="/customize-3d/:id" element={<Customize3D />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/payment/callback" element={<PaymentCallback />} />
                        <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
                        <Route path="/track-order" element={<TrackOrder />} />
                        <Route path="/login" element={<Auth />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/dashboard" element={<Dashboard />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                </CustomizationProvider>
              </CartProvider>
            </ChatProvider>
          </NotificationProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
