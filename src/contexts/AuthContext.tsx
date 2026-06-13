import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const TIERS = {
  free: { name: "FREE", maxScans: 10 },
  tax_advisor: { name: "STEUERBERATER", maxScans: 50 },
  relax: {
    name: "RELAX",
    maxScans: 150,
    yearly: {
      price_id: "price_1T8dZK2OSLlEeYaUvGn20UPk",
      product_id: "prod_U6rHCwqL7uWXeh",
      price: 12,
    },
    monthly: {
      price_id: "price_1T8dd52OSLlEeYaUnkzNTDZd",
      product_id: "prod_U6rLEE9hn7z3AX",
      price: 3,
    },
  },
  master: {
    name: "MASTER",
    maxScans: Infinity,
    yearly: {
      price_id: "price_1T8dgW2OSLlEeYaUifi4Z36n",
      product_id: "prod_U6rPZtvWVoYlGl",
      price: 49,
    },
    monthly: {
      price_id: "price_1T8l4i2OSLlEeYaU3OzHyBBP",
      product_id: "prod_U6z2fWio959aX5",
      price: 6,
    },
  },
} as const;

const RELAX_PRODUCT_IDS = [TIERS.relax.yearly.product_id, TIERS.relax.monthly.product_id, "coupon_relax"];
const MASTER_PRODUCT_IDS = [TIERS.master.yearly.product_id, TIERS.master.monthly.product_id, "coupon_master"];

const VIEW_MODE_KEY = "belegmanager.viewMode";

export type ViewMode = "personal" | "advisor";

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  tier: "free" | "relax" | "master" | "tax_advisor";
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionState;
  isAdvisor: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  checkSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "personal";
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    return stored === "advisor" || stored === "personal" ? stored : "personal";
  });
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    tier: "free",
    loading: true,
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  };

  // Force personal mode if user is not an advisor
  useEffect(() => {
    if (!isAdvisor && viewMode !== "personal") {
      setViewMode("personal");
    }
  }, [isAdvisor, viewMode]);

  const checkSubscription = async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) return;
    try {
      // Always fetch the advisor flag from profile (independent of tier path)
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_tax_advisor")
        .eq("id", uid)
        .maybeSingle();
      const advisorFlag = !!profile?.is_tax_advisor;
      setIsAdvisor(advisorFlag);

      // Check subscription/coupon first (may grant higher tier than tax_advisor)
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data?.subscribed) {
        const pid = data?.product_id;
        const tier = MASTER_PRODUCT_IDS.includes(pid) ? "master" : RELAX_PRODUCT_IDS.includes(pid) ? "relax" : "free";
        setSubscription({
          subscribed: true,
          productId: data?.product_id ?? null,
          subscriptionEnd: data?.subscription_end ?? null,
          tier,
          loading: false,
        });
        return;
      }

      // Fall back to tax_advisor profile check
      if (advisorFlag) {
        setSubscription({
          subscribed: true,
          productId: null,
          subscriptionEnd: null,
          tier: "tax_advisor",
          loading: false,
        });
        return;
      }

      // No subscription
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        tier: "free",
        loading: false,
      });
    } catch {
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => checkSubscription(session.user.id), 0);
      } else {
        setIsAdvisor(false);
        setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, tier: "free", loading: false });
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("[Auth] Token refreshed automatically");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkSubscription(session.user.id);
    });

    const refreshInterval = setInterval(async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[Auth] Session refresh failed:", error.message);
      } else if (data.session) {
        console.log("[Auth] Session proactively refreshed");
      }
    }, 10 * 60 * 1000);

    return () => {
      authSub.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, isAdvisor, viewMode, setViewMode, checkSubscription, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
