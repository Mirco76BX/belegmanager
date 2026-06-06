import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScanLine, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { APP_VERSION, APP_BUILD } from "@/lib/version";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string;
  is_tax_advisor: boolean;
  kanzlei: string | null;
  tax_advisor_email: string | null;
  tax_advisor_name: string | null;
}

interface AdvisorInvitation {
  id: string;
  advisor_id: string;
  status: string;
  created_at: string;
  advisor_email?: string;
  advisor_name?: string;
  advisor_kanzlei?: string;
}

interface ActiveAdvisor {
  link_id: string;
  advisor_id: string;
  advisor_email: string;
  advisor_name: string;
  advisor_kanzlei: string | null;
}

/* ---------- Settings-Building-Blocks (iOS-Look) ---------- */

const SettingsGroup = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="px-1 space-y-0.5">
      <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      {subtitle && <p className="text-caption-1 text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
    <div className="rounded-2xl border bg-card overflow-hidden divide-y">{children}</div>
  </div>
);

const SettingsRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[3rem]">
    <span className="text-body text-foreground shrink-0">{label}</span>
    <div className="text-right min-w-0 max-w-[65%]">{children}</div>
  </div>
);

const SettingsField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="px-4 py-3 space-y-2">
    <Label className="text-caption-1 text-muted-foreground font-medium">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    {children}
  </div>
);

/* ---------- Page ---------- */

const Account = () => {
  const { user, subscription, checkSubscription } = useAuth();
  const { lang, tt } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [taxAdvisorName, setTaxAdvisorName] = useState("");
  const [taxAdvisorEmail, setTaxAdvisorEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Advisor access management
  const [pendingInvitations, setPendingInvitations] = useState<AdvisorInvitation[]>([]);
  const [activeAdvisors, setActiveAdvisors] = useState<ActiveAdvisor[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, email, is_tax_advisor, kanzlei, tax_advisor_email, tax_advisor_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setFirstName((data as any).first_name || "");
          setLastName((data as any).last_name || "");
          setDisplayName(data.display_name || "");
          setTaxAdvisorEmail((data as any).tax_advisor_email || "");
          setTaxAdvisorName((data as any).tax_advisor_name || "");
        }
      });
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        setScanCount(count ?? 0);
      });
    fetchAdvisorData();
  }, [user]);

  const fetchAdvisorData = async () => {
    if (!user) return;

    const { data: invitations } = await supabase
      .from("advisor_invitations")
      .select("id, advisor_id, status, created_at")
      .eq("status", "pending");

    if (invitations && invitations.length > 0) {
      const advisorIds = invitations.map((i) => i.advisor_id);
      const { data: advisorProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, kanzlei")
        .in("id", advisorIds);

      const enriched = invitations.map((inv) => {
        const ap = advisorProfiles?.find((p) => p.id === inv.advisor_id);
        return {
          ...inv,
          advisor_email: ap?.email || "",
          advisor_name: [ap?.first_name, ap?.last_name].filter(Boolean).join(" ") || ap?.email || "",
          advisor_kanzlei: ap?.kanzlei || undefined,
        };
      });
      setPendingInvitations(enriched as AdvisorInvitation[]);
    } else {
      setPendingInvitations([]);
    }

    const { data: links } = await supabase
      .from("advisor_clients")
      .select("id, advisor_id")
      .eq("client_id", user.id);

    if (links && links.length > 0) {
      const advisorIds = links.map((l) => l.advisor_id);
      const { data: advisorProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, kanzlei")
        .in("id", advisorIds);

      setActiveAdvisors(
        links.map((l) => {
          const ap = advisorProfiles?.find((p) => p.id === l.advisor_id);
          return {
            link_id: l.id,
            advisor_id: l.advisor_id,
            advisor_email: ap?.email || "",
            advisor_name: [ap?.first_name, ap?.last_name].filter(Boolean).join(" ") || ap?.email || "",
            advisor_kanzlei: ap?.kanzlei || null,
          };
        })
      );
    } else {
      setActiveAdvisors([]);
    }
  };

  const handleRespondInvitation = async (invId: string, action: "accept" | "decline") => {
    setRespondingId(invId);
    try {
      const { data, error } = await supabase.functions.invoke("respond-invitation", {
        body: { invitationId: invId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        action === "accept"
          ? tt({ de: "Einladung angenommen", en: "Invitation accepted" })
          : tt({ de: "Einladung abgelehnt", en: "Invitation declined" })
      );
      fetchAdvisorData();
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setRespondingId(null);
    }
  };

  const handleRevokeAccess = async (linkId: string) => {
    const { error } = await supabase.from("advisor_clients").delete().eq("id", linkId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tt({ de: "Zugriff widerrufen", en: "Access revoked" }));
      fetchAdvisorData();
    }
  };

  const profileIncomplete = !firstName.trim() || !lastName.trim();
  const tierConfig = TIERS[subscription.tier] || TIERS.free;
  const maxScans = tierConfig.maxScans === Infinity ? null : tierConfig.maxScans;
  const progress = maxScans ? Math.min((scanCount / maxScans) * 100, 100) : 0;

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(tt({ de: "Vorname und Nachname sind erforderlich.", en: "First and last name are required." }));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim() || null,
        tax_advisor_email: taxAdvisorEmail.trim() || null,
        tax_advisor_name: taxAdvisorName.trim() || null,
      } as any)
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(tt({ de: "Profil gespeichert", en: "Profile saved" }));
      setProfile((prev) =>
        prev
          ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName.trim() || null }
          : prev
      );
    }
    setSaving(false);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Portal failed");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRedeemCoupon = async () => {
    setCouponLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-coupon", {
        body: { code: couponCode.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(tt({ de: "Gutschein erfolgreich eingelöst!", en: "Coupon redeemed successfully!" }));
        setCouponCode("");
        await checkSubscription();
      }
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setCouponLoading(false);
    }
  };

  const tierLabel =
    subscription.tier === "tax_advisor"
      ? tt({ de: "Steuerberater (kostenlos)", en: "Tax Advisor (free)" })
      : tierConfig.name;

  return (
    <div className="animate-fade-in space-y-6 pb-12 max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
          {tt({ de: "Einstellungen", en: "Settings" })}
        </p>
        <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">
          {tt({ de: "Mein Konto", en: "My Account" })}
        </h1>
      </div>

      {/* Profil-Incomplete Warning */}
      {profileIncomplete && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-footnote text-destructive font-medium leading-relaxed">
            {tt({
              de: "Bitte vervollständige dein Profil: Vorname und Nachname sind erforderlich.",
              en: "Please complete your profile: first and last name are required.",
            })}
          </p>
        </div>
      )}

      {/* Sektion: Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <SettingsGroup
          title={tt({ de: "Offene Einladungen", en: "Pending Invitations" })}
          subtitle={tt({
            de: "Steuerberater warten auf deine Zustimmung für Lesezugriff auf deine Belege.",
            en: "Tax advisors waiting for your approval to read your receipts.",
          })}
        >
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="px-4 py-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium truncate">{inv.advisor_name}</p>
                {inv.advisor_kanzlei && (
                  <p className="text-footnote text-muted-foreground truncate">{inv.advisor_kanzlei}</p>
                )}
                <p className="text-footnote text-muted-foreground truncate">{inv.advisor_email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  className="h-11 px-3 text-footnote text-primary-foreground"
                  onClick={() => handleRespondInvitation(inv.id, "accept")}
                  disabled={respondingId === inv.id}
                >
                  {respondingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="ml-1.5 hidden sm:inline">{tt({ de: "Annehmen", en: "Accept" })}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-3 text-footnote"
                  onClick={() => handleRespondInvitation(inv.id, "decline")}
                  disabled={respondingId === inv.id}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">{tt({ de: "Ablehnen", en: "Decline" })}</span>
                </Button>
              </div>
            </div>
          ))}
        </SettingsGroup>
      )}

      {/* Sektion: Profil */}
      <SettingsGroup title={tt({ de: "Profil", en: "Profile" })}>
        <SettingsRow label={tt({ de: "E-Mail", en: "Email" })}>
          <span className="text-body text-muted-foreground truncate block">{profile?.email || user?.email}</span>
        </SettingsRow>
        {profile?.is_tax_advisor && profile.kanzlei && (
          <SettingsRow label={tt({ de: "Kanzlei", en: "Firm" })}>
            <span className="text-body text-muted-foreground truncate block">{profile.kanzlei}</span>
          </SettingsRow>
        )}
        <SettingsField label={tt({ de: "Vorname", en: "First name" })} required>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={tt({ de: "Max", en: "John" })}
            className="h-12 text-body"
          />
        </SettingsField>
        <SettingsField label={tt({ de: "Nachname", en: "Last name" })} required>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={tt({ de: "Mustermann", en: "Doe" })}
            className="h-12 text-body"
          />
        </SettingsField>
      </SettingsGroup>

      {/* Sektion: Mein Steuerberater (nur für Nicht-Berater) */}
      {!profile?.is_tax_advisor && (
        <SettingsGroup
          title={tt({ de: "Mein Steuerberater", en: "My Tax Advisor" })}
          subtitle={tt({
            de: "Wird im Report-Tab als Empfänger für DATEV-Stapel und Belegabrechnung verwendet.",
            en: "Used as recipient on the Report tab for DATEV stapel and receipt summary.",
          })}
        >
          <SettingsField label={tt({ de: "Name (optional)", en: "Name (optional)" })}>
            <Input
              value={taxAdvisorName}
              onChange={(e) => setTaxAdvisorName(e.target.value)}
              placeholder={tt({ de: "Vor- und Nachname", en: "First and last name" })}
              className="h-12 text-body"
            />
          </SettingsField>
          <SettingsField label={tt({ de: "E-Mail", en: "Email" })}>
            <Input
              type="email"
              value={taxAdvisorEmail}
              onChange={(e) => setTaxAdvisorEmail(e.target.value)}
              placeholder={tt({ de: "kontakt@kanzlei.de", en: "contact@firm.com" })}
              className="h-12 text-body"
            />
          </SettingsField>
        </SettingsGroup>
      )}

      {/* Save Profile Button */}
      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full h-13 text-body font-semibold text-primary-foreground gap-2"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {tt({ de: "Profil speichern", en: "Save Profile" })}
      </Button>

      {/* Sektion: Steuerberater-Zugriff (active) */}
      {activeAdvisors.length > 0 && (
        <SettingsGroup
          title={tt({ de: "Steuerberater-Zugriff", en: "Advisor Access" })}
          subtitle={tt({
            de: "Diese Steuerberater haben Lesezugriff. Du kannst den Zugriff jederzeit widerrufen.",
            en: "These advisors have read access. You can revoke at any time.",
          })}
        >
          {activeAdvisors.map((adv) => (
            <div key={adv.link_id} className="px-4 py-3.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-body font-medium truncate">{adv.advisor_name}</p>
                  <span className="px-2 py-0.5 rounded-full text-caption-2 font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {tt({ de: "Aktiv", en: "Active" })}
                  </span>
                </div>
                {adv.advisor_kanzlei && (
                  <p className="text-footnote text-muted-foreground truncate mt-0.5">{adv.advisor_kanzlei}</p>
                )}
                <p className="text-footnote text-muted-foreground truncate">{adv.advisor_email}</p>
              </div>
              <Button
                variant="outline"
                className="h-11 px-3 text-footnote text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                onClick={() => handleRevokeAccess(adv.link_id)}
              >
                {tt({ de: "Widerrufen", en: "Revoke" })}
              </Button>
            </div>
          ))}
        </SettingsGroup>
      )}

      {/* Sektion: Abo & Verbrauch */}
      <SettingsGroup title={tt({ de: "Abo & Verbrauch", en: "Plan & Usage" })}>
        <SettingsRow label={tt({ de: "Aktueller Plan", en: "Current Plan" })}>
          <span className="text-body font-semibold">{tierLabel}</span>
        </SettingsRow>
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-body text-foreground flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-muted-foreground" />
              {tt({ de: "Scans verbraucht", en: "Scans used" })}
            </span>
            <span className="text-body font-semibold font-mono tabular-nums">
              {scanCount}
              {maxScans ? ` / ${maxScans}` : ""}
            </span>
          </div>
          {maxScans ? (
            <Progress value={progress} className="h-2" />
          ) : (
            <p className="text-caption-1 text-muted-foreground">{tt({ de: "Unbegrenzt", en: "Unlimited" })}</p>
          )}
        </div>
        {subscription.subscriptionEnd && (
          <SettingsRow label={tt({ de: "Verlängert sich am", en: "Renews on" })}>
            <span className="text-body text-muted-foreground">
              {new Date(subscription.subscriptionEnd).toLocaleDateString(getLocale(lang))}
            </span>
          </SettingsRow>
        )}
        <div className="px-4 py-3.5">
          {(subscription.tier === "basic" ||
            subscription.tier === "pro" ||
            subscription.tier === "business" ||
            subscription.tier === "cfo") && (
            <Button
              variant="outline"
              className="w-full h-11 text-body"
              onClick={handleManage}
              disabled={portalLoading}
            >
              {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tt({ de: "Abo verwalten", en: "Manage Subscription" })}
            </Button>
          )}
          {(subscription.tier === "free" || subscription.tier === "tax_advisor") && (
            <Button
              className="w-full h-13 text-body font-semibold text-primary-foreground"
              onClick={() => navigate("/pricing")}
            >
              {tt({ de: "Plan upgraden", en: "Upgrade Plan" })}
            </Button>
          )}
        </div>
      </SettingsGroup>

      {/* Sektion: Gutschein */}
      <SettingsGroup
        title={tt({ de: "Gutscheincode", en: "Coupon Code" })}
        subtitle={tt({
          de: "Hast du einen Code? Gib ihn hier ein, um deinen Zugang freizuschalten.",
          en: "Have a code? Enter it here to unlock your access.",
        })}
      >
        <div className="px-4 py-3.5 flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={tt({ de: "Gutscheincode", en: "Coupon Code" })}
            className="h-12 text-body uppercase flex-1"
          />
          <Button
            className="h-12 px-5 text-body font-semibold text-primary-foreground shrink-0"
            disabled={couponLoading || !couponCode.trim()}
            onClick={handleRedeemCoupon}
          >
            {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt({ de: "Einlösen", en: "Redeem" })}
          </Button>
        </div>
      </SettingsGroup>

      {/* Sektion: App-Info */}
      <SettingsGroup title={tt({ de: "App-Info", en: "App Info" })}>
        <SettingsRow label={tt({ de: "Version", en: "Version" })}>
          <span className="text-body text-muted-foreground font-mono">{APP_VERSION}</span>
        </SettingsRow>
        <SettingsRow label={tt({ de: "Build", en: "Build" })}>
          <span className="text-body text-muted-foreground font-mono">{APP_BUILD}</span>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};

export default Account;
