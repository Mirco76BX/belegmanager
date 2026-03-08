import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Send, Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ContactSection = () => {
  const { lang } = useLanguage();
  const [form, setForm] = useState({ name: "", organization: "", email: "", phone: "", orgType: "company", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border-2 border-border p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Building2 className="h-5 w-5 text-secondary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {lang === "de" ? "Für Firmen, Vereine & Steuerberater" : "For Companies, Associations & Tax Advisors"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {lang === "de"
          ? "Individuelle Konditionen für Ihr Team oder Ihre Organisation. Kontaktieren Sie uns für ein maßgeschneidertes Angebot."
          : "Custom pricing for your team or organization. Contact us for a tailored offer."}
      </p>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Check className="h-10 w-10 text-accent" />
          <p className="font-medium text-foreground">
            {lang === "de" ? "Vielen Dank! Wir melden uns bei Ihnen." : "Thank you! We'll get back to you."}
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            const { error } = await supabase.from("contact_requests").insert({
              name: form.name.trim(),
              organization: form.organization.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || null,
              org_type: form.orgType,
              message: form.message.trim() || null,
            });
            if (error) {
              toast.error(error.message);
            } else {
              setSent(true);
            }
            setSending(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Name *" : "Name *"}</Label>
              <Input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Organisation *" : "Organization *"}</Label>
              <Input required value={form.organization} onChange={(e) => setForm(f => ({ ...f, organization: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "E-Mail *" : "Email *"}</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Telefon" : "Phone"}</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{lang === "de" ? "Typ *" : "Type *"}</Label>
            <Select value={form.orgType} onValueChange={(v) => setForm(f => ({ ...f, orgType: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">{lang === "de" ? "Firma" : "Company"}</SelectItem>
                <SelectItem value="association">{lang === "de" ? "Verein" : "Association"}</SelectItem>
                <SelectItem value="tax_advisor">{lang === "de" ? "Steuerberater" : "Tax Advisor"}</SelectItem>
                <SelectItem value="other">{lang === "de" ? "Sonstiges" : "Other"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{lang === "de" ? "Nachricht (optional)" : "Message (optional)"}</Label>
            <Textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows={3} className="resize-none" />
          </div>

          <Button type="submit" className="w-full sm:w-auto gap-2" disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            {lang === "de" ? "Anfrage senden" : "Send Request"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ContactSection;
