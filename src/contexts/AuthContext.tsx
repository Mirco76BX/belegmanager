import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * BelegManager Pricing-Struktur (gültig ab Juni 2026):
 *
 *   FREE       0 €              20 Scans / Jahr        Privat-Test
 *   BASIC      1,99 € / 15 €    50 Scans / Monat       Privat, Reisekosten, PDF
 *   PRO        9,99 € / 79 €    200 Scans / Monat      + DATEV + GoBD + Multi-Mandant
 *   BUSINESS  19,99 € / 159 €   1.000/Monat Pool       + Team 5 User, Multi-Mandant
 *      + User  4,99 € / 39 €    +200/Monat zum Pool    Add-on
 *   CFO       39 € / Monat      ab 6. Mandant          Steuerberater
 *   SCAN-PACK  4,99 € einmalig   50 Scans (12 Mo gültig) Saison-User
 *
 *   TAX_ADVISOR (legacy): kostenloser Berater-Tier ohne Mandanten-Limit (Bestandsschutz)
 *
 * Stripe-Setup-Anleitung:
 *   1) Stripe Dashboard → Products → für jeden Tier ein Product anlegen
 *   2) Pro Product zwei Prices: monthly + yearly (außer FREE/CFO/SCAN_PACK)
 *   3) Price-IDs in TIERS unten ersetzen (price_TODO_xxx → echte price_xxx)
 *   4) Product-IDs ebenfalls ersetzen (prod_TODO_xxx → echte prod_xxx)
 */
export const TIERS = {
  free: { name: "FREE", maxScans: 20 },
  tax_advisor: { name: "STEUERBERATER (Legacy)", maxScans: 50 },
  basic: {
    name: "BASIC",
    maxScans: 600, // 50/Monat × 12
    yearly: {
      price_id: "price_1TeAum2OSLlEeYaUNjPgClz9",
      product_id: "prod_UdRow3yNW8hP20",
      price: 15,
    },
    monthly: {
      price_id: "price_1TeAum2OSLlEeYaU0fwftxL5",
      product_id: "prod_UdRow3yNW8hP20",
      price: 1.99,
    },
  },
  pro: {
    name: "PRO",
    maxScans: 2400, // 200/Monat × 12
    yearly: {
      price_id: "price_1TeAve2OSLlEeYaUUoM91rwc",
      product_id: "prod_UdRo7Q2vuXLGnB",
      price: 79,
    },
    monthly: {
      price_id: "price_1TeAvC2OSLlEeYaU3M2hR3H6",
      product_id: "prod_UdRo7Q2vuXLGnB",
      price: 9.99,
    },
  },
  business: {
    name: "BUSINESS",
    maxScans: 12000, // 1000/Monat × 12 Pool, +200/User
    includedUsers: 5,
    yearly: {
      price_id: "price_1TeAwm2OSLlEeYaUQUxexiO6",
      product_id: "prod_UdRqYozsiuaiFS",
      price: 159,
    },
    monthly: {
      price_id: "price_1TeAwT2OSLlEeYaUQGKFGKV3",
      product_id: "prod_UdRqYozsiuaiFS",
      price: 19.99,
    },
    addonUser: {
      yearly: { price_id: "price_1TeAxN2OSLlEeYaUWIncLoLo", price: 39 },
      monthly: { price_id: "price_1TeAx62OSLlEeYaU067gNLCC", price: 4.99 },
    },
  },
  cfo: {
    name: "CFO",
    maxScans: Infinity,
    minMandanten: 6,
    monthly: {
      price_id: "price_1TeAxn2OSLlEeYaU3ji6Hu4R",
      product_id: "prod_UdRrHLUUtrAEU4",
      price: 39,
    },
  },
} as const;

/**
 * Scan-Packs als One-Time-Purchase (Saison-User, Steuererklärungszeit).
 * 50 Scans, gültig 12 Monate ab Kauf.
 */
export const SCAN_PACKS = {
  pack_50: {
    name: "Scan-Pack 50",
    scans: 50,
    validityMonths: 12,
    price: 4.99,
    price_id: "price_1TeAyW2OSLlEeYaU9bZEoeZ9",
    product_id: "prod_UdRsyk6KmmwUyO",
  },
} as const;

const BASIC_PRODUCT_IDS = [TIERS.basic.yearly.product_id, TIERS.basic.monthly.product_id, "coupon_basic"];
// Legacy "coupon_relax" wird auf PRO gehoben (Bestandsschutz für alte Tester)
const PRO_PRODUCT_IDS = [TIERS.pro.yearly.product_id, TIERS.pro.monthly.product_id, "coupon_pro", "coupon_relax"];
const BUSINESS_PRODUCT_IDS = [TIERS.business.yearly.product_id, TIERS.business.monthly.product_id, "coupon_business"];
// Legacy "coupon_master" wird auf CFO gehoben (Bestandsschutz für alte Master-Coupon-Tester)
const CFO_PRODUCT_IDS = [TIERS.cfo.monthly.product_id, "coupon_cfo", "coupon_master"];

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  tier: "free" | "basic" | "pro" | "business" | "cfo" | "tax_advisor";
  loading: boolean;
}

/**
 * Aktive Ansicht für User, die sowohl Mandant als auch Steuerberater sind.
 *
 * - "personal": normale Mandant-Sicht (Dashboard, eigene Belege, eigene Companies)
 * - "advisor":  Kanzlei-Sicht (Mandanten-Übersicht, Steuerberater-Tools)
 *
 * Der Switch ist nur sichtbar, wenn isAdvisor=true. Nicht-Steuerberater
 * sehen den Switch nicht und bleiben automatisch im "personal" Modus.
 */
export type ViewMode = "personal" | "advisor";

const VIEW_MODE_STORAGE_KEY = "belegmanager.viewMode";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionState;
  /** True wenn der User profile.is_tax_advisor=true hat (= Switch-Button anzeigen) */
  isAdvisor: boolean;
  /** Aktuelle Sicht — auto-Default je nach isAdvisor, manuell überschreibbar */
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
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    tier: "free",
    loading: true,
  });
  /** Steuerberater-Status des Users (profiles.is_tax_advisor) — bestimmt, ob der Switch-Button sichtbar ist. */
  const [isAdvisor, setIsAdvisor] = useState(false);
  /** Aktuelle Ansicht: "personal" oder "advisor". Persistent im LocalStorage. */
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "personal";
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === "advisor" ? "advisor" : "personal";
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // LocalStorage kann blockiert sein — kein Hard-Fail
    }
  };

  /**
   * Founder-Override: bestimmte E-Mails bekommen IMMER unlimited Access (CFO-Tier),
   * unabhängig von Stripe-Subscription. Nützlich für Gründer, internes Testing,
   * Demo-Konten für Vertrieb. NICHT für reguläre User — hier explizit hardcoded
   * damit niemand das per DB-Update fälschen kann (Email kommt aus Supabase Auth,
   * server-validiert).
   */
  const FOUNDER_EMAILS = new Set<string>([
    "mirco@bakerix.de",
    "m.gruebel@anno76.de",
  ]);

  const checkSubscription = async (userId?: string, userEmail?: string) => {
    const uid = userId || user?.id;
    if (!uid) return;
    try {
      // Founder-Override IMMER zuerst. Email MUSS als Parameter kommen,
      // weil user-State beim ersten Login noch nicht im Closure vorhanden ist.
      const currentEmail = (userEmail || user?.email || "").toLowerCase();
      if (FOUNDER_EMAILS.has(currentEmail)) {
        setSubscription({
          subscribed: true,
          productId: "founder_override",
          subscriptionEnd: null,
          tier: "cfo",
          loading: false,
        });
        // Auch für Founder den isAdvisor-Flag aus dem Profil ziehen,
        // damit der View-Mode-Switch sichtbar ist, falls der Founder
        // gleichzeitig Steuerberater ist.
        const { data: founderProfile } = await supabase
          .from("profiles")
          .select("is_tax_advisor")
          .eq("id", uid)
          .maybeSingle();
        setIsAdvisor(!!founderProfile?.is_tax_advisor);
        return;
      }

      // Check subscription/coupon first (may grant higher tier than tax_advisor)
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data?.subscribed) {
        const pid = data?.product_id;
        const tier = CFO_PRODUCT_IDS.includes(pid)
          ? "cfo"
          : BUSINESS_PRODUCT_IDS.includes(pid)
            ? "business"
            : PRO_PRODUCT_IDS.includes(pid)
              ? "pro"
              : BASIC_PRODUCT_IDS.includes(pid)
                ? "basic"
                : "free";
        setSubscription({
          subscribed: true,
          productId: data?.product_id ?? null,
          subscriptionEnd: data?.subscription_end ?? null,
          tier,
          loading: false,
        });
        // Auch bei aktiver Subscription den isAdvisor-Flag aus dem Profil
        // ziehen — User kann beides sein: zahlender Mandant + Steuerberater.
        const { data: subProfile } = await supabase
          .from("profiles")
          .select("is_tax_advisor")
          .eq("id", uid)
          .maybeSingle();
        setIsAdvisor(!!subProfile?.is_tax_advisor);
        return;
      }

      // Fall back to tax_advisor profile check
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_tax_advisor")
        .eq("id", uid)
        .maybeSingle();

      // isAdvisor wird IMMER aus dem Profile übernommen — unabhängig vom Tier.
      // (Founder mit tier=cfo aber is_tax_advisor=true können trotzdem den Switch nutzen.)
      setIsAdvisor(!!profile?.is_tax_advisor);

      if (profile?.is_tax_advisor) {
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
      // isAdvisor wurde bereits oben aus dem Profil gesetzt — hier nichts mehr tun.
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
        setTimeout(() => checkSubscription(session.user.id, session.user.email ?? undefined), 0);
      } else {
        setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, tier: "free", loading: false });
      }

      // If token was refreshed, log it for debugging
      if (event === "TOKEN_REFRESHED") {
        console.log("[Auth] Token refreshed automatically");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkSubscription(session.user.id, session.user.email ?? undefined);
    });

    // Proactively refresh the session every 10 minutes to prevent token expiry
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

  // Periodic refresh every 60s
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

  // Wenn User Steuerberater-Status verliert (Profil-Update), View-Mode auf
  // "personal" zwingen — sonst sieht der User Kanzlei-Sicht ohne Berechtigung.
  useEffect(() => {
    if (!isAdvisor && viewMode === "advisor") {
      setViewMode("personal");
    }
  }, [isAdvisor, viewMode]);

  // Effektive Ansicht: wenn isAdvisor=true und kein expliziter LocalStorage-Wert,
  // greift der Default aus dem useState-Initializer ("personal"). User kann
  // jederzeit via setViewMode wechseln.
  const effectiveViewMode: ViewMode = isAdvisor ? viewMode : "personal";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        isAdvisor,
        viewMode: effectiveViewMode,
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
