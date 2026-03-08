import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText, ScanLine, FolderOpen, FileSpreadsheet, ShieldCheck, Users,
  ArrowRight, CheckCircle2, Smartphone, Cloud, Lock,
} from "lucide-react";
import receiptScanImg from "@/assets/receipt-scan.jpg";
import taxAdvisorImg from "@/assets/tax-advisor-hero.jpg";
import testimonial1Img from "@/assets/testimonial-1.jpg";
import testimonial2Img from "@/assets/testimonial-2.jpg";
import testimonial3Img from "@/assets/testimonial-3.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Star } from "lucide-react";

const Demo = () => {
  const { lang, setLang, tt } = useLanguage();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [regForm, setRegForm] = useState({ name: "", kanzlei: "", email: "", password: "", confirmPassword: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regDone, setRegDone] = useState(false);
  const [regError, setRegError] = useState("");
  const [regConsent, setRegConsent] = useState(false);

  const steps = [
    {
      icon: ScanLine,
      title: tt({de:"1. Beleg fotografieren", en:"1. Snap a receipt", tr:"1. Fişi fotoğraflayın", ar:"1. صوّر الإيصال", ru:"1. Сфотографируйте чек"}),
      desc: tt({de:"Ihr Mandant fotografiert den Beleg mit dem Smartphone – die KI erkennt Betrag, Datum und Beschreibung automatisch.", en:"Your client photographs the receipt with their smartphone – AI automatically detects amount, date, and description.", tr:"Müşteriniz fişi akıllı telefonuyla fotoğraflar – yapay zeka tutarı, tarihi ve açıklamayı otomatik algılar.", ar:"يصور عميلك الإيصال بهاتفه الذكي – يكتشف الذكاء الاصطناعي المبلغ والتاريخ والوصف تلقائياً.", ru:"Ваш клиент фотографирует чек смартфоном – ИИ автоматически распознаёт сумму, дату и описание."}),
    },
    {
      icon: FolderOpen,
      title: tt({de:"2. Zuordnen & verwalten", en:"2. Organize & manage", tr:"2. Düzenleyin ve yönetin", ar:"2. نظّم وأدِر", ru:"2. Организуйте и управляйте"}),
      desc: tt({de:"Belege werden Organisationen zugeordnet, mit Bewirtungsangaben ergänzt und übersichtlich gespeichert.", en:"Receipts are assigned to organizations, enriched with hospitality details, and stored clearly.", tr:"Fişler kuruluşlara atanır, ağırlama detaylarıyla zenginleştirilir ve düzenli olarak saklanır.", ar:"يتم تعيين الإيصالات للمنظمات وإثرائها بتفاصيل الضيافة وتخزينها بوضوح.", ru:"Чеки привязываются к организациям, дополняются данными о представительских расходах и хранятся упорядоченно."}),
    },
    {
      icon: FileSpreadsheet,
      title: tt({de:"3. Reisekostenabrechnung exportieren", en:"3. Export expense reports", tr:"3. Masraf raporlarını dışa aktarın", ar:"3. تصدير تقارير المصاريف", ru:"3. Экспортируйте отчёты о расходах"}),
      desc: tt({de:"Per Klick erstellt Ihr Mandant eine fertige Reisekostenabrechnung als PDF – bereit für Ihre Buchhaltung.", en:"With one click, your client generates a ready-to-use expense report as PDF – ready for your accounting.", tr:"Tek tıklamayla müşteriniz kullanıma hazır masraf raporunu PDF olarak oluşturur – muhasebeniz için hazır.", ar:"بنقرة واحدة ينشئ عميلك تقرير مصاريف جاهز كملف PDF – جاهز لمحاسبتك.", ru:"Одним нажатием ваш клиент создаёт готовый отчёт о расходах в PDF – готов для бухгалтерии."}),
    },
  ];

  const benefits = [
    { icon: ShieldCheck, title: tt({de:"Weniger Rückfragen", en:"Fewer follow-ups", tr:"Daha az geri dönüş", ar:"استفسارات أقل", ru:"Меньше запросов"}), desc: tt({de:"Vollständige, digitale Belege mit allen relevanten Informationen – weniger Nachfragen an Mandanten.", en:"Complete, digital receipts with all relevant info – fewer queries to clients.", tr:"Tüm ilgili bilgilerle eksiksiz, dijital fişler – müşterilere daha az soru.", ar:"إيصالات رقمية كاملة بجميع المعلومات ذات الصلة – استفسارات أقل للعملاء.", ru:"Полные цифровые чеки со всей информацией – меньше вопросов клиентам."}) },
    { icon: Users, title: tt({de:"Mandantenbindung stärken", en:"Strengthen client loyalty", tr:"Müşteri bağlılığını güçlendirin", ar:"تعزيز ولاء العملاء", ru:"Укрепление лояльности клиентов"}), desc: tt({de:"Empfehlen Sie ein modernes Tool, das Ihren Mandanten das Leben erleichtert.", en:"Recommend a modern tool that makes life easier for your clients.", tr:"Müşterilerinizin hayatını kolaylaştıran modern bir araç önerin.", ar:"أوصِ بأداة حديثة تسهّل حياة عملائك.", ru:"Рекомендуйте современный инструмент, который упрощает жизнь ваших клиентов."}) },
    { icon: Cloud, title: tt({de:"Cloud-basiert & sicher", en:"Cloud-based & secure", tr:"Bulut tabanlı ve güvenli", ar:"سحابي وآمن", ru:"Облачное и безопасное"}), desc: tt({de:"Alle Daten verschlüsselt in der Cloud – kein Papierchaos, kein Datenverlust.", en:"All data encrypted in the cloud – no paper chaos, no data loss.", tr:"Tüm veriler bulutta şifreli – kağıt karmaşası yok, veri kaybı yok.", ar:"جميع البيانات مشفرة في السحابة – لا فوضى ورقية، لا فقدان بيانات.", ru:"Все данные зашифрованы в облаке – без бумажного хаоса, без потери данных."}) },
    { icon: Smartphone, title: tt({de:"Optimiert für Mobilgeräte", en:"Mobile-optimized", tr:"Mobil için optimize", ar:"محسّن للجوال", ru:"Оптимизировано для мобильных"}), desc: tt({de:"Ihre Mandanten scannen Belege direkt unterwegs – die App funktioniert auf jedem Gerät.", en:"Your clients scan receipts on the go – the app works on any device.", tr:"Müşterileriniz hareket halindeyken fişleri tarar – uygulama her cihazda çalışır.", ar:"يمسح عملاؤك الإيصالات أثناء التنقل – التطبيق يعمل على أي جهاز.", ru:"Ваши клиенты сканируют чеки на ходу – приложение работает на любом устройстве."}) },
    { icon: Lock, title: tt({de:"DSGVO-konform", en:"GDPR compliant", tr:"KVKK uyumlu", ar:"متوافق مع GDPR", ru:"Соответствует GDPR"}), desc: tt({de:"Datenschutz nach europäischen Standards. Daten werden sicher in Europa gespeichert.", en:"Data protection to European standards. Data is stored securely in Europe.", tr:"Avrupa standartlarında veri koruma. Veriler Avrupa'da güvenle saklanır.", ar:"حماية البيانات وفق المعايير الأوروبية. البيانات مخزنة بأمان في أوروبا.", ru:"Защита данных по европейским стандартам. Данные надёжно хранятся в Европе."}) },
    { icon: FileText, title: tt({de:"Strukturierte Daten", en:"Structured data", tr:"Yapılandırılmış veriler", ar:"بيانات منظمة", ru:"Структурированные данные"}), desc: tt({de:"Saubere, kategorisierte Belege erleichtern Ihren Workflow bei der Steuererklärung.", en:"Clean, categorized receipts streamline your tax filing workflow.", tr:"Temiz, kategorize edilmiş fişler vergi beyannamesi iş akışınızı kolaylaştırır.", ar:"إيصالات نظيفة ومصنفة تسهّل سير عمل الإقرار الضريبي.", ru:"Чистые, категоризированные чеки упрощают процесс подачи налоговой декларации."}) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">BelegManager</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="text-xs text-muted-foreground" />
            <Link to="/auth">
              <Button size="sm">
                {tt({de:"Jetzt starten", en:"Get Started", tr:"Hemen başla", ar:"ابدأ الآن", ru:"Начать"})}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                <ShieldCheck className="h-4 w-4" />
                {tt({de:"Für Steuerberater & deren Mandanten", en:"For tax advisors & their clients", tr:"Vergi danışmanları ve müşterileri için", ar:"للمستشارين الضريبيين وعملائهم", ru:"Для налоговых консультантов и их клиентов"})}
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {tt({
                  de: <>Belege digital.<br className="hidden md:block" /> Steuern einfach.</>,
                  en: <>Receipts digital.<br className="hidden md:block" /> Taxes simple.</>,
                  tr: <>Fişler dijital.<br className="hidden md:block" /> Vergiler kolay.</>,
                  ar: <>إيصالات رقمية.<br className="hidden md:block" /> ضرائب بسيطة.</>,
                  ru: <>Чеки — цифровые.<br className="hidden md:block" /> Налоги — просто.</>,
                } as any)}
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                {tt({de:"Empfehlen Sie Ihren Mandanten ein Tool, das Belege per KI erfasst, organisiert und als fertige Reisekostenabrechnung exportiert – weniger Papier, weniger Rückfragen, mehr Effizienz.", en:"Recommend a tool to your clients that captures receipts via AI, organizes them, and exports ready-made expense reports – less paper, fewer queries, more efficiency.", tr:"Müşterilerinize yapay zeka ile fişleri yakalayan, organize eden ve hazır masraf raporları ihraç eden bir araç önerin – daha az kağıt, daha az soru, daha fazla verimlilik.", ar:"أوصِ عملاءك بأداة تلتقط الإيصالات بالذكاء الاصطناعي وتنظمها وتصدر تقارير مصاريف جاهزة – ورق أقل، استفسارات أقل، كفاءة أكبر.", ru:"Рекомендуйте клиентам инструмент, который захватывает чеки с помощью ИИ, организует их и экспортирует готовые отчёты о расходах – меньше бумаги, меньше вопросов, больше эффективности."})}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <a href="#registrierung">
                  <Button size="lg" className="gap-2 px-8">
                    {tt({de:"Kostenlos registrieren", en:"Register for free", tr:"Ücretsiz kaydol", ar:"سجّل مجاناً", ru:"Бесплатная регистрация"})}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a href="#so-funktionierts">
                  <Button variant="outline" size="lg">
                    {tt({de:"So funktioniert's", en:"How it works", tr:"Nasıl çalışır", ar:"كيف يعمل", ru:"Как это работает"})}
                  </Button>
                </a>
              </div>
            </div>
            <div className="w-full max-w-sm md:max-w-md">
              <div className="relative rounded-2xl shadow-2xl ring-1 ring-border overflow-hidden">
                <img src={receiptScanImg} alt={tt({de:"Beleg scannen mit dem Smartphone", en:"Scanning a receipt with smartphone", tr:"Akıllı telefonla fiş tarama", ar:"مسح الإيصال بالهاتف الذكي", ru:"Сканирование чека смартфоном"})} className="w-full" loading="lazy" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5" />
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </section>

      <section id="so-funktionierts" className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            {tt({de:"So funktioniert's", en:"How it works", tr:"Nasıl çalışır", ar:"كيف يعمل", ru:"Как это работает"})}
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            {tt({de:"In drei einfachen Schritten vom Beleg zur Abrechnung.", en:"From receipt to report in three simple steps.", tr:"Üç basit adımda fişten rapora.", ar:"من الإيصال إلى التقرير في ثلاث خطوات بسيطة.", ru:"От чека к отчёту за три простых шага."})}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="group rounded-xl border-2 border-border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            {tt({de:"Ihre Vorteile als Steuerberater", en:"Your benefits as a tax advisor", tr:"Vergi danışmanı olarak avantajlarınız", ar:"مزاياك كمستشار ضريبي", ru:"Ваши преимущества как налогового консультанта"})}
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            {tt({de:"Warum Ihre Mandanten BelegManager lieben werden – und Sie auch.", en:"Why your clients will love ReceiptManager – and you will too.", tr:"Müşterileriniz neden BelegManager'ı sevecek – siz de.", ar:"لماذا سيحب عملاؤك مدير الإيصالات – وأنت أيضاً.", ru:"Почему ваши клиенты полюбят ЧекМенеджер – и вы тоже."})}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4 rounded-lg p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <b.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            {tt({de:"So empfehlen Sie BelegManager", en:"How to recommend ReceiptManager", tr:"BelegManager'ı nasıl önerirsiniz", ar:"كيف توصي بمدير الإيصالات", ru:"Как рекомендовать ЧекМенеджер"})}
          </h2>
          <p className="mb-10 text-muted-foreground">
            {tt({de:"Teilen Sie einfach den Link zu dieser Seite – Ihre Mandanten können sofort loslegen.", en:"Simply share the link to this page – your clients can start right away.", tr:"Bu sayfanın bağlantısını paylaşın – müşterileriniz hemen başlayabilir.", ar:"ما عليك سوى مشاركة رابط هذه الصفحة – يمكن لعملائك البدء فوراً.", ru:"Просто поделитесь ссылкой на эту страницу – ваши клиенты смогут начать сразу."})}
          </p>
          <div className="mx-auto max-w-md space-y-4 text-left">
            {[
              tt({de:"Senden Sie Ihren Mandanten den Link zur Registrierung", en:"Send your clients the registration link", tr:"Müşterilerinize kayıt bağlantısını gönderin", ar:"أرسل لعملائك رابط التسجيل", ru:"Отправьте клиентам ссылку на регистрацию"}),
              tt({de:"Mandant registriert sich kostenlos (10 Scans inklusive)", en:"Client signs up for free (10 scans included)", tr:"Müşteri ücretsiz kaydolur (10 tarama dahil)", ar:"يسجل العميل مجاناً (10 عمليات مسح مشمولة)", ru:"Клиент регистрируется бесплатно (10 сканирований включено)"}),
              tt({de:"Belege werden automatisch per KI erfasst", en:"Receipts are automatically captured via AI", tr:"Fişler yapay zeka ile otomatik olarak yakalanır", ar:"يتم التقاط الإيصالات تلقائياً عبر الذكاء الاصطناعي", ru:"Чеки автоматически захватываются ИИ"}),
              tt({de:"Fertige Reisekostenabrechnungen als PDF exportieren", en:"Export ready-made expense reports as PDF", tr:"Hazır masraf raporlarını PDF olarak dışa aktarın", ar:"تصدير تقارير المصاريف الجاهزة كملف PDF", ru:"Экспортируйте готовые отчёты о расходах в PDF"}),
              tt({de:"Sie erhalten strukturierte, digitale Belege", en:"You receive structured, digital receipts", tr:"Yapılandırılmış, dijital fişler alırsınız", ar:"تحصل على إيصالات رقمية منظمة", ru:"Вы получаете структурированные цифровые чеки"}),
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent mt-0.5" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <a href="#registrierung">
              <Button size="lg" className="gap-2 px-8">
                {tt({de:"Jetzt registrieren", en:"Register now", tr:"Şimdi kaydol", ar:"سجّل الآن", ru:"Зарегистрироваться"})}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Tax Advisor Recommendation */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
            <div className="w-full max-w-xs shrink-0">
              <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-border">
                <img src={taxAdvisorImg} alt={tt({de:"Moderner Steuerberater empfiehlt BelegManager", en:"Modern tax advisor recommends ReceiptManager", tr:"Modern mali müşavir BelegManager'ı öneriyor", ar:"مستشار ضريبي حديث يوصي بمدير الإيصالات", ru:"Современный налоговый консультант рекомендует ЧекМенеджер"})} className="w-full" loading="lazy" />
              </div>
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <blockquote className="text-xl font-medium leading-relaxed text-foreground italic">
                {tt({
                  de: "\u201EAls Steuerberater empfehle ich meinen Mandanten BelegManager, weil es den gesamten Belegprozess digitalisiert und uns beiden wertvolle Zeit spart. Die KI-gest\u00FCtzte Erfassung ist beeindruckend genau.\u201C",
                  en: "\u201CAs a tax advisor, I recommend ReceiptManager to my clients because it digitizes the entire receipt process and saves us both valuable time. The AI-powered capture is impressively accurate.\u201D",
                  tr: "\u201CBir vergi dan\u0131\u015Fman\u0131 olarak m\u00FC\u015Fterilerime BelegManager\u2019\u0131 \u00F6neriyorum \u00E7\u00FCnk\u00FC t\u00FCm fi\u015F s\u00FCrecini dijitalle\u015Ftiriyor ve her ikimize de de\u011Ferli zaman kazand\u0131r\u0131yor.\u201D",
                  ar: "\u201Cكمستشار ضريبي، أنصح عملائي بمدير الإيصالات لأنه يرقمن عملية الإيصالات بالكامل ويوفر لنا وقتاً ثميناً.\u201D",
                  ru: "\u201CКак налоговый консультант, я рекомендую ЧекМенеджер своим клиентам, потому что он оцифровывает весь процесс работы с чеками и экономит нам обоим ценное время.\u201D",
                })}
              </blockquote>
              <div>
                <p className="font-semibold text-foreground">Thomas Weber</p>
                <p className="text-sm text-muted-foreground">{tt({de:"Steuerberater, Kanzlei Weber & Partner", en:"Tax Advisor, Weber & Partner", tr:"Mali Müşavir, Weber & Partner", ar:"مستشار ضريبي، ويبر وشركاه", ru:"Налоговый консультант, Weber & Partner"})}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
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
                text: tt({
                  de: "Endlich kein Schuhkarton voller Quittungen mehr! Die KI erkennt alles sofort und die Reisekostenabrechnung erstellt sich fast von allein. Absolute Empfehlung!",
                  en: "Finally no more shoebox full of receipts! The AI recognizes everything instantly and expense reports practically create themselves. Highly recommended!",
                  tr: "Sonunda kutu dolusu fişlerden kurtuldum! Yapay zeka her şeyi anında tanıyor ve masraf raporları neredeyse kendiliğinden oluşuyor.",
                  ar: "أخيراً لا مزيد من صناديق الإيصالات! الذكاء الاصطناعي يتعرف على كل شيء فوراً وتقارير المصاريف تنشئ نفسها تقريباً.",
                  ru: "Наконец-то никаких коробок с чеками! ИИ распознаёт всё мгновенно, а отчёты о расходах создаются почти сами. Абсолютная рекомендация!",
                }),
              },
              {
                img: testimonial2Img,
                name: "Dr. Michael Braun",
                role: tt({de:"Geschäftsführer, Braun Consulting", en:"CEO, Braun Consulting", tr:"Genel Müdür, Braun Consulting", ar:"المدير التنفيذي، Braun Consulting", ru:"Генеральный директор, Braun Consulting"}),
                text: tt({
                  de: "Als Vielreisender ist BelegManager für mich unverzichtbar geworden. Beleg fotografieren, fertig. Mein Steuerberater bekommt alles digital und ordentlich – das spart uns beiden enorm Zeit.",
                  en: "As a frequent traveler, ReceiptManager has become indispensable. Snap a receipt, done. My tax advisor gets everything digitally and neatly – saves us both enormous time.",
                  tr: "Sık seyahat eden biri olarak BelegManager vazgeçilmezim oldu. Fişi çek, bitti. Mali müşavirim her şeyi dijital ve düzenli alıyor.",
                  ar: "كمسافر دائم، أصبح مدير الإيصالات لا غنى عنه. صوّر الإيصال وانتهى الأمر. مستشاري الضريبي يحصل على كل شيء رقمياً ومنظماً.",
                  ru: "Как часто путешествующий человек, ЧекМенеджер стал для меня незаменим. Сфотографировал чек – готово. Мой консультант получает всё в цифровом виде.",
                }),
              },
              {
                img: testimonial3Img,
                name: "Lukas Hofmann",
                role: tt({de:"Vereinsvorstand, TSV Grünwald", en:"Association Chair, TSV Grünwald", tr:"Dernek Başkanı, TSV Grünwald", ar:"رئيس الجمعية، TSV Grünwald", ru:"Председатель, TSV Grünwald"}),
                text: tt({
                  de: "Für unseren Verein ist BelegManager perfekt: Alle Vorstandsmitglieder können Belege mobil erfassen und wir haben endlich einen sauberen Überblick über unsere Ausgaben. Klare 5 Sterne!",
                  en: "BelegManager is perfect for our association: all board members can capture receipts on mobile and we finally have a clean overview of our expenses. A clear 5 stars!",
                  tr: "Derneğimiz için BelegManager mükemmel: tüm yönetim kurulu üyeleri fişleri mobil olarak kaydedebiliyor ve harcamalarımızın temiz bir genel görünümüne sahibiz.",
                  ar: "مدير الإيصالات مثالي لجمعيتنا: يمكن لجميع أعضاء مجلس الإدارة التقاط الإيصالات عبر الجوال ولدينا أخيراً نظرة واضحة على مصاريفنا.",
                  ru: "ЧекМенеджер идеален для нашего объединения: все члены правления могут фиксировать чеки с мобильного, и у нас наконец чёткий обзор расходов.",
                }),
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
      </section>

      <section className="px-4 py-20" id="registrierung">
        <div className="mx-auto max-w-lg">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              {tt({de:"Kostenlos als Steuerberater registrieren", en:"Register free as a tax advisor", tr:"Vergi danışmanı olarak ücretsiz kaydolun", ar:"سجّل مجاناً كمستشار ضريبي", ru:"Бесплатная регистрация как налоговый консультант"})}
            </h2>
            <p className="text-muted-foreground">
              {tt({de:"50 Scans kostenlos – testen Sie BelegManager und empfehlen Sie es Ihren Mandanten.", en:"50 free scans – try ReceiptManager and recommend it to your clients.", tr:"50 ücretsiz tarama – BelegManager'ı deneyin ve müşterilerinize önerin.", ar:"50 عملية مسح مجانية – جرّب مدير الإيصالات وأوصِ به لعملائك.", ru:"50 бесплатных сканирований – попробуйте ЧекМенеджер и рекомендуйте клиентам."})}
            </p>
          </div>

          {regDone ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center rounded-xl border-2 border-border">
              <CheckCircle2 className="h-12 w-12 text-accent" />
              <p className="text-lg font-semibold text-foreground">
                {tt({de:"Registrierung erfolgreich!", en:"Registration successful!", tr:"Kayıt başarılı!", ar:"التسجيل ناجح!", ru:"Регистрация успешна!"})}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {tt({de:"Bitte bestätigen Sie Ihre E-Mail-Adresse. Danach können Sie sich anmelden und die App ausprobieren.", en:"Please confirm your email address. Then you can sign in and try the app.", tr:"Lütfen e-posta adresinizi onaylayın. Ardından giriş yapabilir ve uygulamayı deneyebilirsiniz.", ar:"يرجى تأكيد عنوان بريدك الإلكتروني. بعدها يمكنك تسجيل الدخول وتجربة التطبيق.", ru:"Подтвердите email. После этого вы сможете войти и попробовать приложение."})}
              </p>
              <Link to="/auth">
                <Button className="mt-4 gap-2">
                  {tt({de:"Zur Anmeldung", en:"Go to login", tr:"Girişe git", ar:"الذهاب لتسجيل الدخول", ru:"Перейти к входу"})}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRegError("");
                if (regForm.password !== regForm.confirmPassword) {
                  setRegError(tt({de:"Passwörter stimmen nicht überein", en:"Passwords don't match", tr:"Şifreler eşleşmiyor", ar:"كلمات المرور غير متطابقة", ru:"Пароли не совпадают"}));
                  return;
                }
                setRegLoading(true);
                try {
                  const { data, error } = await supabase.auth.signUp({
                    email: regForm.email, password: regForm.password,
                    options: { emailRedirectTo: window.location.origin },
                  });
                  if (error) throw error;
                  if (data.user) {
                    await supabase.from("profiles").update({
                      is_tax_advisor: true, kanzlei: regForm.kanzlei.trim(), display_name: regForm.name.trim(),
                    }).eq("id", data.user.id);
                  }
                  setRegDone(true);
                } catch (err: any) { setRegError(err.message); }
                finally { setRegLoading(false); }
              }}
              className="space-y-4 rounded-xl border-2 border-border p-6 md:p-8"
            >
              <div className="space-y-1.5">
                <Label>{tt({de:"Ihr Name *", en:"Your name *", tr:"Adınız *", ar:"اسمك *", ru:"Ваше имя *"})}</Label>
                <Input required value={regForm.name} onChange={(e) => setRegForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{tt({de:"Kanzlei / Unternehmen *", en:"Firm / Company *", tr:"Büro / Şirket *", ar:"المكتب / الشركة *", ru:"Фирма / Компания *"})}</Label>
                <Input required value={regForm.kanzlei} onChange={(e) => setRegForm(f => ({ ...f, kanzlei: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{tt({de:"E-Mail *", en:"Email *", tr:"E-posta *", ar:"البريد الإلكتروني *", ru:"Эл. почта *"})}</Label>
                <Input required type="email" value={regForm.email} onChange={(e) => setRegForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{tt({de:"Passwort *", en:"Password *", tr:"Şifre *", ar:"كلمة المرور *", ru:"Пароль *"})}</Label>
                <Input required type="password" minLength={6} value={regForm.password} onChange={(e) => setRegForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{tt({de:"Passwort bestätigen *", en:"Confirm password *", tr:"Şifreyi onayla *", ar:"تأكيد كلمة المرور *", ru:"Подтвердить пароль *"})}</Label>
                <Input required type="password" minLength={6} value={regForm.confirmPassword} onChange={(e) => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
              {regError && <p className="text-sm text-destructive">{regError}</p>}
              <div className="flex items-start gap-2">
                <input type="checkbox" id="reg-consent" checked={regConsent} onChange={(e) => setRegConsent(e.target.checked)} required className="mt-1 h-4 w-4 rounded border-input accent-primary" />
                <label htmlFor="reg-consent" className="text-xs text-muted-foreground leading-relaxed">
                  {tt({
                    de: <>Ich stimme der Verarbeitung meiner Daten gemäß der{" "}<Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link> zu. *</>,
                    en: <>I agree to the processing of my data according to the{" "}<Link to="/datenschutz" className="text-primary hover:underline">Privacy Policy</Link>. *</>,
                    tr: <><Link to="/datenschutz" className="text-primary hover:underline">Gizlilik Politikası</Link>'na uygun olarak verilerimin işlenmesini kabul ediyorum. *</>,
                    ar: <>أوافق على معالجة بياناتي وفقاً لـ<Link to="/datenschutz" className="text-primary hover:underline">سياسة الخصوصية</Link>. *</>,
                    ru: <>Я согласен на обработку данных согласно{" "}<Link to="/datenschutz" className="text-primary hover:underline">Политике конфиденциальности</Link>. *</>,
                  } as any)}
                </label>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={regLoading || !regConsent}>
                {regLoading ? tt({de:"Registrierung...", en:"Registering...", tr:"Kaydediliyor...", ar:"جارٍ التسجيل...", ru:"Регистрация..."}) : tt({de:"Kostenlos registrieren", en:"Register for free", tr:"Ücretsiz kaydol", ar:"سجّل مجاناً", ru:"Бесплатная регистрация"})}
                {!regLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {tt({de:"Bereits registriert?", en:"Already registered?", tr:"Zaten kayıtlı mısınız?", ar:"مسجل بالفعل؟", ru:"Уже зарегистрированы?"})}{" "}
                <Link to="/auth" className="text-primary hover:underline">{tt({de:"Anmelden", en:"Sign in", tr:"Giriş yap", ar:"تسجيل الدخول", ru:"Войти"})}</Link>
              </p>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-6 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>BelegManager</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/impressum" className="hover:text-foreground hover:underline">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground hover:underline">
              {tt({de:"Datenschutz", en:"Privacy", tr:"Gizlilik", ar:"الخصوصية", ru:"Конфиденциальность"})}
            </Link>
            <Link to="/auth" className="hover:text-foreground hover:underline">
              {tt({de:"Anmelden", en:"Sign In", tr:"Giriş yap", ar:"تسجيل الدخول", ru:"Войти"})}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
