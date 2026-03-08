import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail, MessageCircle, Copy, Check, Users, ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REGISTER_URL = window.location.origin + "/auth";

interface Invitation {
  id: string;
  email: string;
  created_at: string;
}

const ReferralManager = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const de = lang === "de";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchInvitations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("invitations")
      .select("*")
      .eq("invited_by", user.id)
      .order("created_at", { ascending: false });
    if (data) setInvitations(data);
  };

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("invitations").insert({ invited_by: user.id, email });
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: de ? `Einladung an ${email} gespeichert` : `Invitation saved for ${email}` });
      setEmail("");
      fetchInvitations();
    }
    setLoading(false);
  };

  const handleWhatsApp = () => {
    const message = de
      ? `Hallo! Ich empfehle Ihnen BelegManager zur digitalen Belegverwaltung. Registrieren Sie sich hier kostenlos: ${REGISTER_URL}`
      : `Hi! I recommend ReceiptManager for digital receipt management. Register for free here: ${REGISTER_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    if (user) {
      supabase.from("invitations").insert({ invited_by: user.id, email: "whatsapp-invite" });
      fetchInvitations();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(REGISTER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: de ? "Link kopiert!" : "Link copied!" });
  };

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          {de ? "Mandanten empfehlen" : "Recommend to clients"}
        </h1>
        <p className="text-muted-foreground">
          {de
            ? "Laden Sie Ihre Mandanten ein, BelegManager zu nutzen. Teilen Sie den Registrierungslink per E-Mail, WhatsApp oder kopieren Sie ihn direkt."
            : "Invite your clients to use ReceiptManager. Share the registration link via email, WhatsApp, or copy it directly."}
        </p>
      </div>

      {/* Share link */}
      <Card>
        <CardContent className="py-5">
          <Label className="text-sm mb-2 block">{de ? "Registrierungslink für Mandanten" : "Registration link for clients"}</Label>
          <div className="flex gap-2">
            <Input value={REGISTER_URL} readOnly className="h-9 text-sm bg-muted" />
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (de ? "Kopiert" : "Copied") : (de ? "Kopieren" : "Copy")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite tabs */}
      <Tabs defaultValue="email" className="w-full max-w-lg">
        <TabsList className="w-full">
          <TabsTrigger value="email" className="flex-1 gap-2">
            <Mail className="h-4 w-4" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <form onSubmit={handleEmailInvite} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{de ? "E-Mail-Adresse des Mandanten" : "Client email address"}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mandant@beispiel.de"
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? (de ? "Senden..." : "Sending...") : (de ? "Einladung senden" : "Send invitation")}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="whatsapp">
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {de
                ? "WhatsApp öffnet sich mit einem vorformulierten Empfehlungstext. Wählen Sie dort den Kontakt aus."
                : "WhatsApp will open with a pre-written recommendation. Choose your contact there."}
            </p>
            <Button onClick={handleWhatsApp} className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              {de ? "Mit WhatsApp teilen" : "Share via WhatsApp"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invitations list */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {de ? `Gesendete Einladungen (${invitations.length})` : `Sent invitations (${invitations.length})`}
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground">{inv.email === "whatsapp-invite" ? "WhatsApp" : inv.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString(de ? "de-DE" : "en-US")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralManager;
