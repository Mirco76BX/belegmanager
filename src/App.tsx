import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Receipts from "@/pages/Receipts";
import Companies from "@/pages/Companies";
import ExpenseReport from "@/pages/ExpenseReport";
import AdminUsers from "@/pages/AdminUsers";
import Pricing from "@/pages/Pricing";
import Account from "@/pages/Account";
import Impressum from "@/pages/Impressum";
import Clients from "@/pages/Clients";
import Fahrtkosten from "@/pages/Fahrtkosten";
import Datenschutz from "@/pages/Datenschutz";
import Demo from "@/pages/Demo";
import ResetPassword from "@/pages/ResetPassword";
import NativeAuthCallback from "@/pages/NativeAuthCallback";
import AdvisorSetup from "@/pages/AdvisorSetup";
import Landing from "@/pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Laden...</div>;
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Laden...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

/**
 * Native deep-link listener: handles the `belegmanager://auth/callback` URL
 * that the system browser triggers after the OAuth bridge page redirects.
 * No-op on web.
 */
const NativeDeepLinkHandler = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;

    (async () => {
      const handle = await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
        try {
          if (!url.includes("auth/callback")) return;

          // Parse query + hash from the deep link
          const u = new URL(url);
          const code = u.searchParams.get("code");

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else if (u.hash) {
            const params = new URLSearchParams(u.hash.replace(/^#/, ""));
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        } catch (err) {
          console.error("[Auth] Deep-link session exchange failed:", err);
        } finally {
          // Close the in-app browser if it is still showing
          try { await Browser.close(); } catch {}
        }
      });
      remove = () => handle.remove();
    })();

    return () => { remove?.(); };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <NativeDeepLinkHandler />
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/auth/native-callback" element={<NativeAuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/advisor-setup/:token" element={<AdvisorSetup />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/expense-report" element={<ExpenseReport />} />
                <Route path="/fahrtkosten" element={<Fahrtkosten />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/account" element={<Account />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
