import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail, MessageCircle, Copy, Check, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REGISTER_URL = window.location.origin + "/auth";

interface Invitation { id: string; email: string; created_at: string; }

const ReferralManager = () => {
  const { user } = useAuth();
  const { lang, tt } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchInvitations = async () => {
    if (!user) return;
    const { data } = await supabase.from("invitations").select("*").eq("invited_by", user.id).order("created_at", { ascending: false });
    if (data) setInvitations(data);
  };

  useEffect(() => { fetchInvitations(); }, [user]);

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const message = tt({
      de: `Hallo! Ich empfehle Ihnen BelegManager zur digitalen Belegverwaltung. Registrieren Sie sich hier kostenlos: ${REGISTER_URL}`,
      en: `Hi! I recommend ReceiptManager for digital receipt management. Register for free here: ${REGISTER_URL}`,
      tr: `Merhaba! Dijital fiş yönetimi için BelegManager'ı öneriyorum. Buradan ücretsiz kaydolun: ${REGISTER_URL}`,
      ar: `مرحباً! أوصي بمدير الإيصالات لإدارة الإيصالات الرقمية. سجل مجاناً هنا: ${REGISTER_URL}`,
      ru: `Привет! Рекомендую ЧекМенеджер для управления чеками. Зарегистрируйтесь бесплатно: ${REGISTER_URL}`,
    });

    const subject = tt({
      de: "Empfehlung: BelegManager",
      en: "Recommendation: ReceiptManager",
      tr: "Öneri: BelegManager",
      ar: "توصية: مدير الإيصالات",
      ru: "Рекомендация: ЧекМенеджер",
    });

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, "_self");

    const { error } = await supabase.from("invitations").insert({ invited_by: user.id, email });
    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else { toast({ title: tt({de:`Einladung an ${email} gesendet`, en:`Invitation sent to ${email}`, tr:`${email} için davet gönderildi`, ar:`تم حفظ الدعوة لـ ${email}`, ru:`Приглашение для ${email} отправлено`}) }); setEmail(""); fetchInvitations(); }
    setLoading(false);
  };

  const handleWhatsApp = () => {
    const message = tt({
      de: `Hallo! Ich empfehle Ihnen BelegManager zur digitalen Belegverwaltung. Registrieren Sie sich hier kostenlos: ${REGISTER_URL}`,
      en: `Hi! I recommend ReceiptManager for digital receipt management. Register for free here: ${REGISTER_URL}`,
      tr: `Merhaba! Dijital fiş yönetimi için BelegManager'ı öneriyorum. Buradan ücretsiz kaydolun: ${REGISTER_URL}`,
      ar: `مرحباً! أوصي بمدير الإيصالات لإدارة الإيصالات الرقمية. سجل مجاناً هنا: ${REGISTER_URL}`,
      ru: `Привет! Рекомендую ЧекМенеджер для управления чеками. Зарегистрируйтесь бесплатно: ${REGISTER_URL}`,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    if (user) { supabase.from("invitations").insert({ invited_by: user.id, email: "whatsapp-invite" }); fetchInvitations(); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(REGISTER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: tt({de:"Link kopiert!", en:"Link copied!", tr:"Link kopyalandı!", ar:"تم نسخ الرابط!", ru:"Ссылка скопирована!"}) });
  };

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          {tt({de:"Mandanten empfehlen", en:"Recommend to clients", tr:"Müşterilere önerin", ar:"أوصِ العملاء", ru:"Рекомендовать клиентам"})}
        </h1>
        <p className="text-muted-foreground">
          {tt({
            de:"Laden Sie Ihre Mandanten ein, BelegManager zu nutzen. Teilen Sie den Registrierungslink per E-Mail, WhatsApp oder kopieren Sie ihn direkt.",
            en:"Invite your clients to use ReceiptManager. Share the registration link via email, WhatsApp, or copy it directly.",
            tr:"Müşterilerinizi BelegManager'ı kullanmaya davet edin. Kayıt linkini e-posta, WhatsApp ile paylaşın veya doğrudan kopyalayın.",
            ar:"ادعُ عملاءك لاستخدام مدير الإيصالات. شارك رابط التسجيل عبر البريد أو واتساب أو انسخه مباشرة.",
            ru:"Пригласите клиентов использовать ЧекМенеджер. Поделитесь ссылкой по почте, WhatsApp или скопируйте.",
          })}
        </p>
      </div>
      <Card>
        <CardContent className="py-5">
          <Label className="text-sm mb-2 block">{tt({de:"Registrierungslink für Mandanten", en:"Registration link for clients", tr:"Müşteriler için kayıt linki", ar:"رابط التسجيل للعملاء", ru:"Ссылка для регистрации клиентов"})}</Label>
          <div className="flex gap-2">
            <Input value={REGISTER_URL} readOnly className="h-9 text-sm bg-muted" />
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? tt({de:"Kopiert", en:"Copied", tr:"Kopyalandı", ar:"تم النسخ", ru:"Скопировано"}) : tt({de:"Kopieren", en:"Copy", tr:"Kopyala", ar:"نسخ", ru:"Копировать"})}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="email" className="w-full max-w-lg">
        <TabsList className="w-full">
          <TabsTrigger value="email" className="flex-1 gap-2"><Mail className="h-4 w-4" />E-Mail</TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <form onSubmit={handleEmailInvite} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{tt({de:"E-Mail-Adresse des Mandanten", en:"Client email address", tr:"Müşteri e-posta adresi", ar:"عنوان بريد العميل", ru:"Эл. почта клиента"})}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mandant@beispiel.de" required />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? tt({de:"Senden...", en:"Sending...", tr:"Gönderiliyor...", ar:"جارٍ الإرسال...", ru:"Отправка..."}) : tt({de:"Einladung senden", en:"Send invitation", tr:"Davetiye gönder", ar:"إرسال الدعوة", ru:"Отправить приглашение"})}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="whatsapp">
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {tt({de:"WhatsApp öffnet sich mit einem vorformulierten Empfehlungstext. Wählen Sie dort den Kontakt aus.", en:"WhatsApp will open with a pre-written recommendation. Choose your contact there.", tr:"WhatsApp önceden yazılmış bir metinle açılacak. Kişinizi seçin.", ar:"سيفتح واتساب برسالة جاهزة. اختر جهة الاتصال.", ru:"WhatsApp откроется с готовым текстом. Выберите контакт."})}
            </p>
            <Button onClick={handleWhatsApp} className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              {tt({de:"Mit WhatsApp teilen", en:"Share via WhatsApp", tr:"WhatsApp ile paylaş", ar:"مشاركة عبر واتساب", ru:"Поделиться через WhatsApp"})}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      {invitations.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {tt({de:`Gesendete Einladungen (${invitations.length})`, en:`Sent invitations (${invitations.length})`, tr:`Gönderilen davetiyeler (${invitations.length})`, ar:`الدعوات المرسلة (${invitations.length})`, ru:`Отправленные приглашения (${invitations.length})`})}
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground">{inv.email === "whatsapp-invite" ? "WhatsApp" : inv.email}</span>
                  <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString(getLocale(lang))}</span>
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
