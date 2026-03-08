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
  const { tt } = useLanguage();
  const [form, setForm] = useState({ name: "", organization: "", email: "", phone: "", orgType: "company", message: "" });
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border-2 border-border p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Building2 className="h-5 w-5 text-secondary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {tt({de:"Für Firmen, Vereine & Steuerberater", en:"For Companies, Associations & Tax Advisors", tr:"Firmalar, Dernekler ve Vergi Danışmanları İçin", ar:"للشركات والجمعيات والمستشارين الضريبيين", ru:"Для компаний, объединений и налоговых консультантов"})}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {tt({de:"Individuelle Konditionen für Ihr Team oder Ihre Organisation. Kontaktieren Sie uns für ein maßgeschneidertes Angebot.", en:"Custom pricing for your team or organization. Contact us for a tailored offer.", tr:"Ekibiniz veya kuruluşunuz için özel fiyatlandırma. Kişiye özel teklif için bize ulaşın.", ar:"أسعار مخصصة لفريقك أو منظمتك. تواصل معنا للحصول على عرض مخصص.", ru:"Индивидуальные условия для вашей команды или организации. Свяжитесь с нами для персонального предложения."})}
      </p>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Check className="h-10 w-10 text-accent" />
          <p className="font-medium text-foreground">
            {tt({de:"Vielen Dank! Wir melden uns bei Ihnen.", en:"Thank you! We'll get back to you.", tr:"Teşekkürler! Size geri döneceğiz.", ar:"شكراً! سنعود إليك قريباً.", ru:"Спасибо! Мы свяжемся с вами."})}
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
              <Label className="text-sm">{tt({de:"Name *", en:"Name *", tr:"Ad *", ar:"الاسم *", ru:"Имя *"})}</Label>
              <Input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Organisation *", en:"Organization *", tr:"Kuruluş *", ar:"المنظمة *", ru:"Организация *"})}</Label>
              <Input required value={form.organization} onChange={(e) => setForm(f => ({ ...f, organization: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"E-Mail *", en:"Email *", tr:"E-posta *", ar:"البريد الإلكتروني *", ru:"Эл. почта *"})}</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Telefon", en:"Phone", tr:"Telefon", ar:"الهاتف", ru:"Телефон"})}</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{tt({de:"Typ *", en:"Type *", tr:"Tür *", ar:"النوع *", ru:"Тип *"})}</Label>
            <Select value={form.orgType} onValueChange={(v) => setForm(f => ({ ...f, orgType: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">{tt({de:"Firma", en:"Company", tr:"Şirket", ar:"شركة", ru:"Компания"})}</SelectItem>
                <SelectItem value="association">{tt({de:"Verein", en:"Association", tr:"Dernek", ar:"جمعية", ru:"Объединение"})}</SelectItem>
                <SelectItem value="tax_advisor">{tt({de:"Steuerberater", en:"Tax Advisor", tr:"Vergi Danışmanı", ar:"مستشار ضريبي", ru:"Налоговый консультант"})}</SelectItem>
                <SelectItem value="other">{tt({de:"Sonstiges", en:"Other", tr:"Diğer", ar:"أخرى", ru:"Прочее"})}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{tt({de:"Nachricht (optional)", en:"Message (optional)", tr:"Mesaj (isteğe bağlı)", ar:"رسالة (اختياري)", ru:"Сообщение (необязательно)"})}</Label>
            <Textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} rows={3} className="resize-none" />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="contact-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              required
              className="mt-0.5"
            />
            <label htmlFor="contact-consent" className="text-xs text-muted-foreground leading-relaxed">
              {tt({
                de: <>Ich stimme der Verarbeitung meiner Daten gemäß der{" "}<Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link> zu. *</>,
                en: <>I agree to the processing of my data according to the{" "}<Link to="/datenschutz" className="text-primary hover:underline">Privacy Policy</Link>. *</>,
                tr: <><Link to="/datenschutz" className="text-primary hover:underline">Gizlilik Politikası</Link>'na uygun olarak verilerimin işlenmesini kabul ediyorum. *</>,
                ar: <>أوافق على معالجة بياناتي وفقاً لـ<Link to="/datenschutz" className="text-primary hover:underline">سياسة الخصوصية</Link>. *</>,
                ru: <>Я согласен на обработку данных согласно{" "}<Link to="/datenschutz" className="text-primary hover:underline">Политике конфиденциальности</Link>. *</>,
              } as any)}
            </label>
          </div>

          <Button type="submit" className="w-full sm:w-auto gap-2" disabled={sending || !consent}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            {tt({de:"Anfrage senden", en:"Send Request", tr:"Talep gönder", ar:"إرسال الطلب", ru:"Отправить запрос"})}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ContactSection;
