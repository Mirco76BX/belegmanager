import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

const InviteDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
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
        <form onSubmit={handleInvite} className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;
