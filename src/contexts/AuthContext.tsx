import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────
// Pricing-Konfiguration: 4 aktive Tiers + Add-on User + Scan-Pack
// Plus deprecated relax/master Legacy-Stubs (werden in Sub-Step 6 entfernt
// wenn PricingPlans/Pricing/Account auf die neuen Tiers migriert sind).
// ─────────────────────────────────────────────────────────────────────
export const TIERS = {
  free: {
    name: "FREE",
    maxScans: 7,
    features: ["Basis-Scan"],
  },
  tax_advisor: {
    name: "STEUERBERATER",
    maxScans: 50,
    features: ["Steuerberater-Magic-Link", "Mandanten-Verwaltung"],
  },
  basic: {
    name: "BASIC",
    maxScans: 50,
    pricing: {
      monthly: { price: 1.99, currency: "EUR" },
      yearly: { price: 15, currency: "EUR" },
    },
    features: ["Belegverwaltung", "Reisekosten", "PDF-Report"],
  },
  pro: {
    name: "PRO",
    maxScans: 200,
    pricing: {
      monthly: { price: 9.99, currency: "EUR" },
      yearly: { price: 79, currency: "EUR" },
    },
    features: ["Alles aus BASIC", "DATEV-Export", "GoBD-Festschreibung", "Multi-Mandant"],
  },
  business: {
    name: "BUSINESS",
    maxScans: 1000,
    multiUserIncluded: 5,
    pricing: {
      monthly: { price: 19.99, currency: "EUR" },
      yearly: { price: 159, currency: "EUR" },
    },
    features: ["Alles aus PRO", "API-Zugang", "5 User inkl.", "Team-Scan-Pool"],
  },
  cfo: {
    name: "CFO",
    maxScans: Number.POSITIVE_INFINITY,
    pricing: {
      monthly: { price: 39, currency: "EUR" },
    },
    features: ["Alles aus BUSINESS", "Unlimited Scans"],
  },
  trial_active: {
    name: "TRIAL",
    maxScans: 30,
    features: [
      "Alle PRO-Features für 30 Tage",
      "DATEV-Export",
      "GoBD-Festschreibung",
      "Multi-Mandant",
    ],
  },
  trial_blocked: {
    name: "TRIAL ABGELAUFEN",
    maxScans: 0,
    features: ["Account gesperrt — bitte upgraden"],
  },
  // ─── DEPRECATED Legacy-Stubs (werden in Sub-Step 6 entfernt) ────────
  relax: {
    name: "RELAX (deprecated)",
    maxScans: 150,
    yearly: { price_id: "", product_id: "" },
    monthly: { price_id: "", product_id: "" },
  },
  master: {
    name: "MASTER (deprecated)",
    maxScans: Number.POSITIVE_INFINITY,
    yearly: { price_id: "", product_id: "" },
    monthly: { price_id: "", product_id: "" },
  },
} as const;

export type SubscriptionTier =
  | "free"
  | "tax_advisor"
  | "basic"
  | "pro"
  | "business"
  | "cfo"
  | "trial_active"
  | "trial_blocked"
  | "relax"
  | "master";

export type SubscriptionSource =
  | "founder_override"
  | "stripe"
  | "coupon"
  | "tax_advisor"
  | "trial"
  | "free";

const TIER_BASE_SCANS: Record<SubscriptionTier, number> = {
  free: 7,
  tax_advisor: 50,
  basic: 50,
  pro: 200,
  business: 1000,
  cfo: Number.POSITIVE_INFINITY,
  trial_active: 30,
  trial_blocked: 0,
  relax: 150,
  master: Number.POSITIVE_INFINITY,
};

/**
 * Effektives Scan-Limit: Tier-Basis + Add-on-User-Boost (nur BUSINESS:
 * +200 pro Add-on-User) + Scan-Pack-Top-up.
 */
export function effectiveScanQuota(
  tier: SubscriptionTier,
  scanQuotaTopup: number = 0,
  addonUserSeats: number = 0
): number {
  if (tier === "trial_blocked") return 0;
  const base = TIER_BASE_SCANS[tier];
  if (!Number.isFinite(base)) return Number.POSITIVE_INFINITY;
  const addonBoost = tier === "business" ? addonUserSeats * 200 : 0;
  return base + addonBoost + scanQuotaTopup;
}

const VIEW_MODE_KEY = "belegmanager.viewMode";
export type ViewMode = "personal" | "advisor";

interface TrialInfo {
  active: boolean;
  blocked: boolean;
  endsAt: string | null;
  blockedAt: string | null;
  deletionAt: string | null;
}

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  source: SubscriptionSource;
  productId: string | null;
  subscriptionEnd: string | null;
  scanQuotaTopup: number;
  scansUsedThisMonth: number;
  addonUserSeats: number;
  trial: TrialInfo | null;
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

const initialSubscription: SubscriptionState = {
  subscribed: false,
  tier: "free",
  source: "free",
  productId: null,
  subscriptionEnd: null,
  scanQuotaTopup: 0,
  scansUsedThisMonth: 0,
  addonUserSeats: 0,
  trial: null,
  loading: true,
};

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
  const [subscription, setSubscription] = useState<SubscriptionState>(initialSubscription);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  };

  useEffect(() => {
    if (!isAdvisor && viewMode !== "personal") {
      setViewMode("personal");
    }
  }, [isAdvisor, viewMode]);

  const checkSubscription = async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_tax_advisor")
        .eq("id", uid)
        .maybeSingle();
      setIsAdvisor(!!profile?.is_tax_advisor);

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) {
        setSubscription({ ...initialSubscription, loading: false });
        return;
      }

      const tier = (data.tier as SubscriptionTier) ?? "free";
      const source = (data.source as SubscriptionSource) ?? "free";

      setSubscription({
        subscribed: !!data.subscribed,
        tier,
        source,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        scanQuotaTopup: typeof data.scan_quota_topup === "number" ? data.scan_quota_topup : 0,
        scansUsedThisMonth: typeof data.scans_used_this_month === "number" ? data.scans_used_this_month : 0,
        addonUserSeats: typeof data.addon_user_seats === "number" ? data.addon_user_seats : 0,
        trial: data.trial
          ? {
              active: !!data.trial.active,
              blocked: !!data.trial.blocked,
              endsAt: data.trial.ends_at ?? null,
              blockedAt: data.trial.blocked_at ?? null,
              deletionAt: data.trial.deletion_at ?? null,
            }
          : null,
        loading: false,
      });
    } catch {
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (sess?.user) {
        setTimeout(() => checkSubscription(sess.user.id), 0);
      } else {
        setIsAdvisor(false);
        setSubscription({ ...initialSubscription, loading: false });
      }
      if (event === "TOKEN_REFRESHED") {
        console.log("[Auth] Token refreshed automatically");
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (sess?.user) checkSubscription(sess.user.id);
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
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        isAdvisor,
        viewMode,
        setViewMode,
        checkSubscription,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
