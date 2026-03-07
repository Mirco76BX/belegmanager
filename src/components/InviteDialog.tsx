import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail, MessageCircle } from "lucide-react";

const REGISTER_URL = window.location.origin + "/auth";

const InviteDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("invitations").insert({
      invited_by: user.id,
      email,
    });

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({
        title: lang === "de"
          ? `Einladung an ${email} gespeichert`
          : `Invitation saved for ${email}`,
      });
      setEmail("");
      setOpen(false);
    }
    setLoading(false);
  };

  const handleWhatsAppInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (!cleanPhone) return;

    const message = lang === "de"
      ? `Hallo! Ich nutze BelegManager zur Belegverwaltung und möchte dich einladen. Registriere dich hier: ${REGISTER_URL}`
      : `Hi! I'm using ReceiptManager for expense tracking and would like to invite you. Register here: ${REGISTER_URL}`;

    const whatsappUrl = `https://wa.me/${encodeURIComponent(cleanPhone)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    // Also save in DB
    if (user) {
      supabase.from("invitations").insert({
        invited_by: user.id,
        email: `whatsapp:${cleanPhone}`,
      });
    }

    toast({
      title: lang === "de" ? "WhatsApp wird geöffnet..." : "Opening WhatsApp...",
    });
    setPhone("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <UserPlus className="h-4 w-4" />
          {lang === "de" ? "Einladen" : "Invite"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lang === "de" ? "Kollegen einladen" : "Invite a colleague"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="email" className="w-full">
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
                <Label htmlFor="invite-email">{lang === "de" ? "E-Mail-Adresse" : "Email address"}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kollege@firma.de"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (lang === "de" ? "Senden..." : "Sending...") : (lang === "de" ? "Einladung senden" : "Send invitation")}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="whatsapp">
            <form onSubmit={handleWhatsAppInvite} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="invite-phone">{lang === "de" ? "Telefonnummer (mit Ländervorwahl)" : "Phone number (with country code)"}</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+491701234567"
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={!phone.trim()}>
                <MessageCircle className="h-4 w-4" />
                {lang === "de" ? "Via WhatsApp einladen" : "Invite via WhatsApp"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;
