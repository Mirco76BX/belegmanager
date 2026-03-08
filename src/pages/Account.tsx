import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, CreditCard, ScanLine, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Account = () => {
  const { user, subscription, checkSubscription } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; email: string; is_tax_advisor: boolean; kanzlei: string | null } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const de = lang === "de";

  useEffect(() => {
    if (!user) return;
    // Fetch profile
    supabase.from("profiles").select("display_name, email, is_tax_advisor, kanzlei").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
      }
    });
    // Fetch scan count
    supabase.from("receipts").select("id", { count: "exact", head: true }).then(({ count }) => {
      setScanCount(count ?? 0);
    });
  }, [user]);

  const tierConfig = TIERS[subscription.tier] || TIERS.free;
  const maxScans = tierConfig.maxScans === Infinity ? null : tierConfig.maxScans;
  const progress = maxScans ? Math.min((scanCount / maxScans) * 100, 100) : 0;

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() || null }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success(de ? "Profil gespeichert" : "Profile saved");
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

  const tierLabel = subscription.tier === "tax_advisor"
    ? (de ? "Steuerberater (kostenlos)" : "Tax Advisor (free)")
    : tierConfig.name;

  return (
    <div className="animate-fade-in space-y-6 pb-24 md:pb-8">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">
        {de ? "Mein Konto" : "My Account"}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {de ? "Profil" : "Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{de ? "E-Mail" : "Email"}</Label>
              <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            </div>
            {profile?.is_tax_advisor && profile.kanzlei && (
              <div className="space-y-1.5">
                <Label className="text-sm">{de ? "Kanzlei" : "Firm"}</Label>
                <p className="text-sm text-muted-foreground">{profile.kanzlei}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">{de ? "Anzeigename" : "Display name"}</Label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={de ? "Ihr Name" : "Your name"}
                  className="h-9"
                />
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (de ? "Speichern" : "Save")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription & Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              {de ? "Abo & Verbrauch" : "Plan & Usage"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{de ? "Aktueller Plan" : "Current plan"}</Label>
              <p className="text-sm font-semibold text-foreground">{tierLabel}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ScanLine className="h-3.5 w-3.5" />
                  {de ? "Scans verbraucht" : "Scans used"}
                </span>
                <span className="font-medium text-foreground">
                  {scanCount}{maxScans ? ` / ${maxScans}` : ""} 
                </span>
              </div>
              {maxScans && (
                <Progress value={progress} className="h-2" />
              )}
              {!maxScans && (
                <p className="text-xs text-muted-foreground">{de ? "Unbegrenzt" : "Unlimited"}</p>
              )}
            </div>

            {subscription.subscriptionEnd && (
              <div className="space-y-1.5">
                <Label className="text-sm">{de ? "Verlängert sich am" : "Renews on"}</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.subscriptionEnd).toLocaleDateString(de ? "de-DE" : "en-US")}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {(subscription.tier === "relax" || subscription.tier === "master") && (
                <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading}>
                  {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {de ? "Abo verwalten" : "Manage subscription"}
                </Button>
              )}
              {(subscription.tier === "free" || subscription.tier === "tax_advisor") && (
                <Button size="sm" onClick={() => navigate("/pricing")}>
                  {de ? "Plan upgraden" : "Upgrade plan"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
