import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { FileText, MailCheck, Star } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import receiptScanImg from "@/assets/receipt-scan.jpg";
import testimonial1Img from "@/assets/testimonial-1.jpg";
import testimonial2Img from "@/assets/testimonial-2.jpg";
import testimonial3Img from "@/assets/testimonial-3.jpg";
import PricingPlans from "@/components/PricingPlans";
import ContactSection from "@/components/ContactSection";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t, lang, setLang, tt } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast({ title: tt({de:"Passwörter stimmen nicht überein", en:"Passwords don't match", tr:"Şifreler eşleşmiyor", ar:"كلمات المرور غير متطابقة", ru:"Пароли не совпадают"}), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate("/");
      } else {
        await signUp(email, password);
        setEmailSent(true);
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero / Auth Section */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-4xl animate-fade-in gap-10 items-stretch">
          <div className="hidden flex-1 md:flex flex-col">
            <div className="flex-1 relative rounded-2xl shadow-lg overflow-hidden">
              <img
                src={receiptScanImg}
                alt={tt({de:"Quittung scannen mit dem Smartphone", en:"Scanning a receipt with a smartphone", tr:"Akıllı telefonla fiş tarama", ar:"مسح الإيصال بالهاتف الذكي", ru:"Сканирование чека смартфоном"})}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {tt({de:"Belege einfach scannen und digital verwalten", en:"Simply scan receipts and manage them digitally", tr:"Fişleri kolayca tarayın ve dijital olarak yönetin", ar:"امسح الإيصالات بسهولة وأدرها رقمياً", ru:"Сканируйте чеки и управляйте ими цифрово"})}
            </p>
          </div>
          <div className="w-full max-w-md">
            {/* Mobile image */}
            <div className="mb-0 md:hidden">
              <div className="mx-auto h-36 w-48 overflow-hidden rounded-xl shadow-md">
                <img
                  src={receiptScanImg}
                  alt={tt({de:"Quittung scannen mit dem Smartphone", en:"Scanning a receipt with a smartphone", tr:"Akıllı telefonla fiş tarama", ar:"مسح الإيصال بالهاتف الذكي", ru:"Сканирование чека смартфоном"})}
                  className="h-full w-full object-cover object-center scale-150"
                />
              </div>
            </div>
            <div className="mb-6 text-center -mt-7 relative z-10 md:mb-8 md:mt-0">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
            </div>

            {emailSent ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {isForgot
                      ? tt({de:"Link zum Zurücksetzen gesendet", en:"Reset link sent", tr:"Sıfırlama bağlantısı gönderildi", ar:"تم إرسال رابط إعادة التعيين", ru:"Ссылка для сброса отправлена"})
                      : tt({de:"Bestätigungs-E-Mail gesendet", en:"Confirmation email sent", tr:"Onay e-postası gönderildi", ar:"تم إرسال بريد التأكيد", ru:"Письмо подтверждения отправлено"})}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {isForgot
                      ? tt({de:`Wir haben einen Link zum Zurücksetzen an ${email} gesendet. Klicken Sie auf den Link in der E-Mail.`, en:`We've sent a reset link to ${email}. Click the link in the email.`, tr:`${email} adresine sıfırlama bağlantısı gönderdik. E-postadaki bağlantıya tıklayın.`, ar:`لقد أرسلنا رابط إعادة التعيين إلى ${email}. انقر على الرابط في البريد الإلكتروني.`, ru:`Мы отправили ссылку для сброса на ${email}. Нажмите на ссылку в письме.`})
                      : tt({de:`Wir haben eine Bestätigungs-E-Mail an ${email} gesendet. Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.`, en:`We've sent a confirmation email to ${email}. Please click the link in the email to activate your account.`, tr:`${email} adresine bir onay e-postası gönderdik. Hesabınızı etkinleştirmek için e-postadaki bağlantıya tıklayın.`, ar:`لقد أرسلنا بريد تأكيد إلى ${email}. يرجى النقر على الرابط في البريد الإلكتروني لتفعيل حسابك.`, ru:`Мы отправили письмо подтверждения на ${email}. Нажмите на ссылку в письме, чтобы активировать аккаунт.`})
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tt({de:"Prüfen Sie auch Ihren Spam-Ordner.", en:"Please also check your spam folder.", tr:"Spam klasörünüzü de kontrol edin.", ar:"يرجى التحقق من مجلد البريد العشوائي أيضاً.", ru:"Проверьте также папку спам."})}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => { setEmailSent(false); setMode("login"); }}
                    className="mt-2"
                  >
                    {tt({de:"Zurück zum Login", en:"Back to login", tr:"Girişe dön", ar:"العودة لتسجيل الدخول", ru:"Назад к входу"})}
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{isForgot ? t("auth.forgotPassword") : isLogin ? t("auth.login") : t("auth.register")}</CardTitle>
                  <LanguageSwitcher className="text-xs text-muted-foreground" />
                </div>
                <CardDescription>
                  {isForgot
                    ? tt({de:"Geben Sie Ihre E-Mail ein, um einen Link zum Zurücksetzen zu erhalten", en:"Enter your email to receive a reset link", tr:"Sıfırlama bağlantısı almak için e-postanızı girin", ar:"أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين", ru:"Введите email для получения ссылки сброса"})
                    : isLogin
                    ? tt({de:"Melden Sie sich mit Ihrem Konto an", en:"Sign in to your account", tr:"Hesabınıza giriş yapın", ar:"قم بتسجيل الدخول إلى حسابك", ru:"Войдите в свой аккаунт"})
                    : tt({de:"Erstellen Sie ein neues Konto", en:"Create a new account", tr:"Yeni bir hesap oluşturun", ar:"أنشئ حساباً جديداً", ru:"Создайте новый аккаунт"})}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isForgot ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? t("general.loading") : tt({de:"Link senden", en:"Send link", tr:"Bağlantı gönder", ar:"إرسال الرابط", ru:"Отправить ссылку"})}
                    </Button>
                    <div className="text-center">
                      <button type="button" onClick={() => setMode("login")} className="text-sm font-medium text-primary hover:underline">
                        {tt({de:"Zurück zum Login", en:"Back to login", tr:"Girişe dön", ar:"العودة لتسجيل الدخول", ru:"Назад к входу"})}
                      </button>
                    </div>
                  </form>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                          {t("auth.forgotPassword")}
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t("general.loading") : isLogin ? t("auth.login") : t("auth.register")}
                  </Button>
                </form>
                )}
                {!isForgot && (
                  <>
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    {tt({de:"oder", en:"or", tr:"veya", ar:"أو", ru:"или"})}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) toast({ title: String(error), variant: "destructive" });
                  }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {tt({de:"Mit Google anmelden", en:"Sign in with Google", tr:"Google ile giriş yap", ar:"تسجيل الدخول بـ Google", ru:"Войти через Google"})}
                </Button>
                <div className="mt-4 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
                  </span>
                  <button onClick={() => setMode(isLogin ? "register" : "login")} className="font-medium text-primary hover:underline">
                    {isLogin ? t("auth.register") : t("auth.login")}
                  </button>
                </div>
                  </>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="border-t border-border bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {tt({de:"Unsere Pläne", en:"Our Plans", tr:"Planlarımız", ar:"خططنا", ru:"Наши тарифы"})}
          </h2>
          <p className="text-muted-foreground mb-8">
            {tt({de:"Starten Sie kostenlos und upgraden Sie jederzeit.", en:"Start for free and upgrade anytime.", tr:"Ücretsiz başlayın, istediğiniz zaman yükseltin.", ar:"ابدأ مجاناً وقم بالترقية في أي وقت.", ru:"Начните бесплатно и обновите в любое время."})}
          </p>
        </div>
        <div className="mx-auto max-w-4xl mt-8">
          <PricingPlans compact />
        </div>
      </div>

      {/* Testimonials */}
      <div className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            {tt({de:"Das sagen unsere Nutzer", en:"What our users say", tr:"Kullanıcılarımız ne diyor", ar:"ماذا يقول مستخدمونا", ru:"Что говорят наши пользователи"})}
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            {tt({de:"Überzeugen Sie sich selbst – echte Erfahrungen mit BelegManager.", en:"See for yourself – real experiences with ReceiptManager.", tr:"Kendiniz görün – BelegManager ile gerçek deneyimler.", ar:"اكتشف بنفسك – تجارب حقيقية مع مدير الإيصالات.", ru:"Убедитесь сами – реальный опыт с ЧекМенеджер."})}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                img: testimonial1Img,
                name: "Sandra Müller",
                role: tt({de:"Freiberuflerin", en:"Freelancer", tr:"Serbest çalışan", ar:"عاملة مستقلة", ru:"Фрилансер"}),
                text: tt({de:"Endlich kein Schuhkarton voller Quittungen mehr! Die KI erkennt alles sofort und die Reisekostenabrechnung erstellt sich fast von allein. Absolute Empfehlung!", en:"Finally no more shoebox full of receipts! The AI recognizes everything instantly and expense reports practically create themselves. Highly recommended!", tr:"Sonunda kutu dolusu fişlerden kurtuldum! Yapay zeka her şeyi anında tanıyor ve masraf raporları neredeyse kendiliğinden oluşuyor.", ar:"أخيراً لا مزيد من صناديق الإيصالات! الذكاء الاصطناعي يتعرف على كل شيء فوراً وتقارير المصاريف تنشئ نفسها تقريباً.", ru:"Наконец-то никаких коробок с чеками! ИИ распознаёт всё мгновенно, а отчёты о расходах создаются почти сами. Абсолютная рекомендация!"}),
              },
              {
                img: testimonial2Img,
                name: "Dr. Michael Braun",
                role: tt({de:"Geschäftsführer, Braun Consulting", en:"CEO, Braun Consulting", tr:"Genel Müdür, Braun Consulting", ar:"المدير التنفيذي، Braun Consulting", ru:"Генеральный директор, Braun Consulting"}),
                text: tt({de:"Als Vielreisender ist BelegManager für mich unverzichtbar geworden. Beleg fotografieren, fertig. Mein Steuerberater bekommt alles digital und ordentlich – das spart uns beiden enorm Zeit.", en:"As a frequent traveler, ReceiptManager has become indispensable. Snap a receipt, done. My tax advisor gets everything digitally and neatly – saves us both enormous time.", tr:"Sık seyahat eden biri olarak BelegManager vazgeçilmezim oldu. Fişi çek, bitti. Mali müşavirim her şeyi dijital ve düzenli alıyor.", ar:"كمسافر دائم، أصبح مدير الإيصالات لا غنى عنه. صوّر الإيصال وانتهى الأمر. مستشاري الضريبي يحصل على كل شيء رقمياً ومنظماً.", ru:"Как часто путешествующий человек, ЧекМенеджер стал для меня незаменим. Сфотографировал чек – готово. Мой консультант получает всё в цифровом виде."}),
              },
              {
                img: testimonial3Img,
                name: "Lukas Hofmann",
                role: tt({de:"Vereinsvorstand, TSV Grünwald", en:"Association Chair, TSV Grünwald", tr:"Dernek Başkanı, TSV Grünwald", ar:"رئيس الجمعية، TSV Grünwald", ru:"Председатель, TSV Grünwald"}),
                text: tt({de:"Für unseren Verein ist BelegManager perfekt: Alle Vorstandsmitglieder können Belege mobil erfassen und wir haben endlich einen sauberen Überblick über unsere Ausgaben. Klare 5 Sterne!", en:"BelegManager is perfect for our association: all board members can capture receipts on mobile and we finally have a clean overview of our expenses. A clear 5 stars!", tr:"Derneğimiz için BelegManager mükemmel: tüm yönetim kurulu üyeleri fişleri mobil olarak kaydedebiliyor ve harcamalarımızın temiz bir genel görünümüne sahibiz.", ar:"مدير الإيصالات مثالي لجمعيتنا: يمكن لجميع أعضاء مجلس الإدارة التقاط الإيصالات عبر الجوال ولدينا أخيراً نظرة واضحة على مصاريفنا.", ru:"ЧекМенеджер идеален для нашего объединения: все члены правления могут фиксировать чеки с мобильного, и у нас наконец чёткий обзор расходов."}),
              },
            ].map((t) => (
              <div key={t.name} className="flex flex-col items-center rounded-xl border-2 border-border bg-card p-6 text-center">
                <img src={t.img} alt={t.name} className="mb-4 h-20 w-20 rounded-full object-cover ring-2 ring-primary/20" loading="lazy" />
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground italic">{"\u201E"}{t.text}{"\u201C"}</p>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="px-4 py-16">
        <ContactSection />
      </div>

      <footer className="py-4 text-center space-x-4">
        <Link to="/demo" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {tt({de:"Für Steuerberater", en:"For Tax Advisors", tr:"Vergi danışmanları için", ar:"للمستشارين الضريبيين", ru:"Для налоговых консультантов"})}
        </Link>
        <Link to="/impressum" state={{ from: "/auth" }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Impressum
        </Link>
        <Link to="/datenschutz" state={{ from: "/auth" }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {tt({de:"Datenschutz", en:"Privacy", tr:"Gizlilik", ar:"الخصوصية", ru:"Конфиденциальность"})}
        </Link>
      </footer>
    </div>
  );
};

export default Auth;
