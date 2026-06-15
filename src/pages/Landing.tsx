import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  FileText,
  Clock,
  FileDown,
  Smartphone,
  Camera,
  ScanLine,
  Send,
  ShieldCheck,
  MapPin,
  Lock,
  Check,
  ArrowRight,
  Users,
  Briefcase,
  Calculator,
} from "lucide-react";
import receiptScanImg from "@/assets/receipt-scan.jpg";

const Landing = () => {
  const { tt } = useLanguage();

  const benefits = [
    {
      icon: Clock,
      title: tt({
        de: "15 Stunden/Monat sparen",
        en: "Save 15 hours/month",
        tr: "Ayda 15 saat tasarruf",
        ar: "وفّر 15 ساعة شهرياً",
        ru: "Экономьте 15 часов в месяц",
      }),
      desc: tt({
        de: "OCR + automatische Verbuchung erspart das Tippen in Excel-Listen. Ein Foto pro Beleg – das war's.",
        en: "OCR + auto-booking removes Excel data entry. One photo per receipt — done.",
        tr: "OCR + otomatik kayıt Excel'e veri girişini ortadan kaldırır. Fiş başına bir fotoğraf yeter.",
        ar: "التعرّف الضوئي + الحجز التلقائي يلغي إدخال البيانات يدويًا. صورة واحدة لكل إيصال.",
        ru: "OCR + автоматический учёт избавляют от ввода в Excel. Одно фото — и всё.",
      }),
    },
    {
      icon: FileDown,
      title: tt({
        de: "DATEV-Export in 2 Klicks",
        en: "DATEV export in 2 clicks",
        tr: "2 tıkla DATEV dışa aktarımı",
        ar: "تصدير DATEV بنقرتين",
        ru: "Экспорт DATEV в 2 клика",
      }),
      desc: tt({
        de: "Direkt an deinen Steuerberater senden. GoBD-konform mit Festschreibung – ohne Medienbruch.",
        en: "Send straight to your tax advisor. GoBD-compliant with locking — no breaks in the audit trail.",
        tr: "Doğrudan mali müşavirinize gönderin. GoBD uyumlu, denetim güvenli.",
        ar: "أرسل مباشرة إلى مستشارك الضريبي. متوافق مع GoBD بدون انقطاع في التدقيق.",
        ru: "Отправляйте налоговому консультанту напрямую. GoBD-совместимо, с фиксацией.",
      }),
    },
    {
      icon: Smartphone,
      title: tt({
        de: "Funktioniert von überall",
        en: "Works from anywhere",
        tr: "Her yerden çalışır",
        ar: "يعمل من أي مكان",
        ru: "Работает откуда угодно",
      }),
      desc: tt({
        de: "iPhone, Android, Web – gleicher Login. Beleg fotografieren im Restaurant, fertig abrechnen am Schreibtisch.",
        en: "iPhone, Android, web – same login. Snap a receipt at the restaurant, finalize at your desk.",
        tr: "iPhone, Android, web – aynı giriş. Restoranda çek, masada tamamla.",
        ar: "iPhone وAndroid والويب – نفس تسجيل الدخول. صوّر في المطعم وأنهِ على المكتب.",
        ru: "iPhone, Android, веб — один логин. Сфотографировал в ресторане, оформил за столом.",
      }),
    },
  ];

  const personas = [
    {
      icon: Users,
      title: tt({
        de: "Selbstständige & Freelancer",
        en: "Self-employed & freelancers",
        tr: "Serbest çalışanlar",
        ar: "العاملون لحسابهم والمستقلون",
        ru: "Самозанятые и фрилансеры",
      }),
      plan: "BASIC / PRO",
      desc: tt({
        de: "Alle Belege, Reisekosten und Fahrten an einem Ort. PRO inkl. unbegrenzte Scans und Multi-Mandant.",
        en: "All receipts, expenses and trips in one place. PRO incl. unlimited scans and multi-client.",
        tr: "Tüm fişler, masraflar ve seyahatler tek yerde. PRO sınırsız tarama içerir.",
        ar: "كل الإيصالات والمصاريف والرحلات في مكان واحد. PRO يشمل المسح غير المحدود.",
        ru: "Все чеки, расходы и поездки в одном месте. PRO включает неограниченное сканирование.",
      }),
    },
    {
      icon: Briefcase,
      title: tt({
        de: "Kleine Unternehmen mit Team",
        en: "Small companies with a team",
        tr: "Ekipli küçük işletmeler",
        ar: "الشركات الصغيرة ذات الفرق",
        ru: "Малый бизнес с командой",
      }),
      plan: "BUSINESS",
      desc: tt({
        de: "5 Nutzer inklusive. Belege erfassen das ganze Team, Auswertung läuft zentral.",
        en: "5 users included. The whole team captures receipts, reporting runs centrally.",
        tr: "5 kullanıcı dahil. Tüm ekip fiş çeker, raporlama merkezi.",
        ar: "يشمل 5 مستخدمين. الفريق بأكمله يلتقط الإيصالات والتقارير مركزية.",
        ru: "5 пользователей включено. Вся команда сканирует, отчёты централизованы.",
      }),
    },
    {
      icon: Calculator,
      title: tt({
        de: "Steuerberater",
        en: "Tax advisors",
        tr: "Mali müşavirler",
        ar: "المستشارون الضريبيون",
        ru: "Налоговые консультанты",
      }),
      plan: tt({
        de: "Kostenlos",
        en: "Free",
        tr: "Ücretsiz",
        ar: "مجاناً",
        ru: "Бесплатно",
      }),
      desc: tt({
        de: "Kostenlos für Steuerberater-Accounts. Mandanten per Magic-Link einladen – DATEV-Export liegt bereit.",
        en: "Free for tax advisor accounts. Invite clients via magic-link — DATEV export is ready to pull.",
        tr: "Mali müşavir hesapları ücretsiz. Müşterileri magic-link ile davet edin.",
        ar: "مجاناً لحسابات المستشارين الضريبيين. ادعُ العملاء عبر رابط سحري.",
        ru: "Бесплатно для аккаунтов налоговых консультантов. Приглашайте клиентов по magic-link.",
      }),
    },
  ];

  const steps = [
    {
      icon: Camera,
      title: tt({ de: "1. Beleg fotografieren", en: "1. Snap the receipt", tr: "1. Fişi çek", ar: "1. صوّر الإيصال", ru: "1. Сфотографируй чек" }),
      desc: tt({
        de: "Mit Smartphone-Kamera oder Datei-Upload (PDF, JPG, PNG).",
        en: "Phone camera or file upload (PDF, JPG, PNG).",
        tr: "Telefon kamerası veya dosya yükleme.",
        ar: "كاميرا الهاتف أو رفع ملف.",
        ru: "Камера телефона или загрузка файла.",
      }),
    },
    {
      icon: ScanLine,
      title: tt({
        de: "2. App erkennt alles",
        en: "2. App reads everything",
        tr: "2. Uygulama her şeyi okur",
        ar: "2. التطبيق يقرأ كل شيء",
        ru: "2. Приложение считывает всё",
      }),
      desc: tt({
        de: "Datum, Betrag, MwSt., Lieferant und Kategorie – automatisch.",
        en: "Date, amount, VAT, vendor and category — automatically.",
        tr: "Tarih, tutar, KDV, satıcı ve kategori – otomatik.",
        ar: "التاريخ والمبلغ والضريبة والمورّد والفئة – تلقائيًا.",
        ru: "Дата, сумма, НДС, поставщик и категория — автоматически.",
      }),
    },
    {
      icon: Send,
      title: tt({
        de: "3. DATEV-Export – 1 Klick",
        en: "3. DATEV export — 1 click",
        tr: "3. DATEV dışa aktarımı – 1 tık",
        ar: "3. تصدير DATEV – نقرة واحدة",
        ru: "3. Экспорт DATEV — 1 клик",
      }),
      desc: tt({
        de: "CSV oder PDF an deinen Steuerberater. GoBD-konform.",
        en: "CSV or PDF to your tax advisor. GoBD-compliant.",
        tr: "Mali müşavire CSV veya PDF. GoBD uyumlu.",
        ar: "CSV أو PDF إلى المستشار الضريبي. متوافق مع GoBD.",
        ru: "CSV или PDF налоговому консультанту. GoBD-совместимо.",
      }),
    },
  ];

  const plans = [
    {
      name: "BASIC",
      price: "1,99\u00A0€",
      tagline: tt({
        de: "Einstieg für Selbstständige",
        en: "Entry for self-employed",
        tr: "Serbest çalışanlar için giriş",
        ar: "البداية للعاملين لحسابهم",
        ru: "Старт для самозанятых",
      }),
      features: [
        tt({ de: "50 Scans/Monat", en: "50 scans/month", tr: "50 tarama/ay", ar: "50 مسح/شهر", ru: "50 сканов/мес." }),
        tt({ de: "DATEV-Export", en: "DATEV export", tr: "DATEV dışa aktarımı", ar: "تصدير DATEV", ru: "Экспорт DATEV" }),
        tt({ de: "Mobile App", en: "Mobile app", tr: "Mobil uygulama", ar: "تطبيق الجوال", ru: "Мобильное приложение" }),
      ],
    },
    {
      name: "PRO",
      price: "9,99\u00A0€",
      featured: true,
      tagline: tt({
        de: "Beliebtester Plan",
        en: "Most popular",
        tr: "En popüler plan",
        ar: "الأكثر شعبية",
        ru: "Самый популярный",
      }),
      features: [
        tt({ de: "Unbegrenzte Scans", en: "Unlimited scans", tr: "Sınırsız tarama", ar: "مسح غير محدود", ru: "Безлимит сканов" }),
        tt({ de: "Multi-Mandant", en: "Multi-client", tr: "Çoklu müşteri", ar: "متعدد العملاء", ru: "Несколько клиентов" }),
        tt({ de: "Fahrtkosten-Assistent", en: "Mileage assistant", tr: "Kilometre asistanı", ar: "مساعد المسافات", ru: "Помощник по пробегу" }),
      ],
    },
    {
      name: "BUSINESS",
      price: "19,99\u00A0€",
      tagline: tt({
        de: "Für Teams bis 5 Personen",
        en: "Teams up to 5 people",
        tr: "5 kişiye kadar ekipler",
        ar: "فرق حتى 5 أشخاص",
        ru: "Команды до 5 человек",
      }),
      features: [
        tt({ de: "5 Nutzer inklusive", en: "5 users included", tr: "5 kullanıcı dahil", ar: "5 مستخدمين", ru: "5 пользователей" }),
        tt({ de: "Zentrales Reporting", en: "Central reporting", tr: "Merkezi raporlama", ar: "تقارير مركزية", ru: "Централизованные отчёты" }),
        tt({ de: "Priorisierter Support", en: "Priority support", tr: "Öncelikli destek", ar: "دعم ذو أولوية", ru: "Приоритетная поддержка" }),
      ],
    },
  ];

  const faqs = [
    {
      q: tt({
        de: "Was ist GoBD-Festschreibung?",
        en: "What is GoBD locking?",
        tr: "GoBD kilitleme nedir?",
        ar: "ما هو قفل GoBD؟",
        ru: "Что такое GoBD-фиксация?",
      }),
      a: tt({
        de: "GoBD ist die deutsche Vorschrift zur ordnungsgemäßen Aufbewahrung digitaler Buchführung. Festschreibung bedeutet: Belege werden unveränderbar gespeichert und sind damit revisionssicher für eine Betriebsprüfung.",
        en: "GoBD is the German regulation for proper digital bookkeeping. Locking means receipts are stored immutably and remain audit-proof for tax audits.",
        tr: "GoBD, dijital muhasebenin doğru saklanmasına ilişkin Alman düzenlemesidir. Kilitleme, fişlerin değiştirilemez şekilde saklanması anlamına gelir.",
        ar: "GoBD هي اللائحة الألمانية لحفظ المحاسبة الرقمية بشكل سليم. القفل يعني تخزين الإيصالات بشكل غير قابل للتغيير.",
        ru: "GoBD — немецкое регулирование цифрового бухучёта. Фиксация: чеки хранятся неизменяемо и пригодны для аудита.",
      }),
    },
    {
      q: tt({
        de: "Wie funktioniert der DATEV-Export?",
        en: "How does DATEV export work?",
        tr: "DATEV dışa aktarımı nasıl çalışır?",
        ar: "كيف يعمل تصدير DATEV؟",
        ru: "Как работает экспорт DATEV?",
      }),
      a: tt({
        de: "Du wählst den Zeitraum (z.B. Monat, Quartal), klickst auf Export und erhältst eine DATEV-kompatible CSV inkl. PDF-Belegbildern. Direkt per E-Mail an deinen Steuerberater senden – fertig.",
        en: "Pick a period (month, quarter), click export, and get a DATEV-compatible CSV plus PDF receipt images. Email it to your advisor — done.",
        tr: "Dönemi seç, dışa aktar tıkla, DATEV uyumlu CSV ve PDF görüntülerini al. E-postayla gönder.",
        ar: "اختر الفترة، انقر تصدير، احصل على CSV متوافق مع DATEV وصور PDF. أرسلها بالبريد.",
        ru: "Выберите период, нажмите экспорт, получите DATEV-совместимый CSV и PDF-копии чеков. Отправьте письмом.",
      }),
    },
    {
      q: tt({
        de: "Kann ich meinen Steuerberater einladen?",
        en: "Can I invite my tax advisor?",
        tr: "Mali müşavirimi davet edebilir miyim?",
        ar: "هل يمكنني دعوة مستشاري الضريبي؟",
        ru: "Могу ли я пригласить налогового консультанта?",
      }),
      a: tt({
        de: "Ja. Steuerberater erhalten einen kostenlosen Account und greifen per Magic-Link auf deine Mandanten-Belege zu. Keine Zusatzkosten für dich oder deinen Berater.",
        en: "Yes. Tax advisors get a free account and access your client receipts via magic-link. No extra cost for you or your advisor.",
        tr: "Evet. Mali müşavirler ücretsiz hesap alır ve magic-link ile erişir. Ek ücret yok.",
        ar: "نعم. يحصل المستشار على حساب مجاني ويصل عبر رابط سحري. لا تكاليف إضافية.",
        ru: "Да. Консультанты получают бесплатный аккаунт и доступ по magic-link. Без доплат.",
      }),
    },
    {
      q: tt({
        de: "Was passiert mit meinen Daten?",
        en: "What happens to my data?",
        tr: "Verilerime ne olur?",
        ar: "ماذا يحدث لبياناتي؟",
        ru: "Что происходит с моими данными?",
      }),
      a: tt({
        de: "Deine Daten werden ausschließlich auf Servern in der EU gespeichert (DSGVO-konform). Wir verkaufen keine Daten, keine Werbe-Tracker, kein Data-Sharing. Du kannst dein Konto und alle Belege jederzeit komplett löschen.",
        en: "Your data is stored exclusively on EU servers (GDPR-compliant). No data sales, no ad-trackers, no data sharing. You can delete your account and all receipts anytime.",
        tr: "Verileriniz yalnızca AB sunucularında saklanır (GDPR uyumlu). Veri satışı yok.",
        ar: "تُخزَّن بياناتك حصريًا على خوادم الاتحاد الأوروبي (متوافق مع GDPR). لا بيع للبيانات.",
        ru: "Данные хранятся только на серверах ЕС (GDPR). Никаких продаж данных и трекеров.",
      }),
    },
    {
      q: tt({
        de: "Kann ich monatlich kündigen?",
        en: "Can I cancel monthly?",
        tr: "Aylık iptal edebilir miyim?",
        ar: "هل يمكنني الإلغاء شهريًا؟",
        ru: "Можно ли отменить ежемесячно?",
      }),
      a: tt({
        de: "Ja. Alle Pläne sind monatlich kündbar. Keine Vertragsbindung, keine versteckten Gebühren.",
        en: "Yes. All plans are cancelable monthly. No contracts, no hidden fees.",
        tr: "Evet. Tüm planlar aylık iptal edilebilir.",
        ar: "نعم. جميع الخطط قابلة للإلغاء شهريًا.",
        ru: "Да. Все тарифы можно отменить ежемесячно.",
      }),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">BelegManager</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{tt({ de: "Anmelden", en: "Sign in", tr: "Giriş", ar: "تسجيل الدخول", ru: "Войти" })}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">{tt({ de: "Kostenlos starten", en: "Start free", tr: "Ücretsiz başla", ar: "ابدأ مجاناً", ru: "Начать бесплатно" })}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24 md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {tt({
                de: "Made in Germany · DSGVO · GoBD",
                en: "Made in Germany · GDPR · GoBD",
                tr: "Made in Germany · GDPR · GoBD",
                ar: "صُنع في ألمانيا · GDPR · GoBD",
                ru: "Made in Germany · GDPR · GoBD",
              })}
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {tt({
                de: "Schluss mit Schuhkarton-Buchhaltung.",
                en: "End the shoebox bookkeeping.",
                tr: "Ayakkabı kutusu muhasebesine son.",
                ar: "نهاية محاسبة صندوق الأحذية.",
                ru: "Конец «коробочной» бухгалтерии.",
              })}
              <span className="block text-primary mt-2">
                {tt({
                  de: "Belege scannen, automatisch erfassen, an den Steuerberater senden — in 3 Minuten pro Woche.",
                  en: "Scan receipts, capture them automatically, send to your tax advisor — in 3 minutes per week.",
                  tr: "Fişleri tara, otomatik kaydet, mali müşavire gönder — haftada 3 dakika.",
                  ar: "امسح الإيصالات، سجّلها تلقائيًا، أرسلها للمستشار — 3 دقائق أسبوعيًا.",
                  ru: "Сканируй чеки, фиксируй автоматически, отправляй консультанту — 3 минуты в неделю.",
                })}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {tt({
                de: "Für Selbstständige, kleine Unternehmen und Steuerberater. GoBD-konform. DATEV-Export. Made in Germany.",
                en: "For self-employed, small companies and tax advisors. GoBD-compliant. DATEV export. Made in Germany.",
                tr: "Serbest çalışanlar, küçük işletmeler ve mali müşavirler için. GoBD uyumlu. DATEV dışa aktarımı.",
                ar: "للعاملين لحسابهم والشركات الصغيرة والمستشارين الضريبيين. متوافق مع GoBD. تصدير DATEV.",
                ru: "Для самозанятых, малого бизнеса и налоговых консультантов. GoBD. Экспорт DATEV.",
              })}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/auth">
                  {tt({
                    de: "Kostenlos testen — 7 Scans, keine Kreditkarte",
                    en: "Try free — 7 scans, no credit card",
                    tr: "Ücretsiz dene — 7 tarama, kart yok",
                    ar: "جرّب مجاناً — 7 عمليات مسح، بدون بطاقة",
                    ru: "Попробовать бесплатно — 7 сканов, без карты",
                  })}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#how">
                  {tt({ de: "Wie funktioniert's?", en: "How it works", tr: "Nasıl çalışır?", ar: "كيف يعمل؟", ru: "Как это работает" })}
                </a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">
              <img
                src={receiptScanImg}
                alt={tt({
                  de: "Beleg scannen mit dem Smartphone",
                  en: "Scanning a receipt with a smartphone",
                  tr: "Akıllı telefonla fiş tarama",
                  ar: "مسح الإيصال بالهاتف",
                  ru: "Сканирование чека телефоном",
                })}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              {tt({ de: "Warum BelegManager?", en: "Why BelegManager?", tr: "Neden BelegManager?", ar: "لماذا BelegManager؟", ru: "Почему BelegManager?" })}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {tt({
                de: "Drei messbare Versprechen statt Buzzwords.",
                en: "Three measurable promises instead of buzzwords.",
                tr: "Vızıltı yerine üç ölçülebilir söz.",
                ar: "ثلاثة وعود قابلة للقياس بدلًا من الكلمات الطنانة.",
                ru: "Три измеримых обещания вместо громких слов.",
              })}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((b, i) => (
              <Card key={i} className="border-2">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOR WHOM */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              {tt({ de: "Für wen?", en: "For whom?", tr: "Kimler için?", ar: "لمن؟", ru: "Для кого?" })}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {personas.map((p, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <p.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {p.plan}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              {tt({ de: "Wie funktioniert's?", en: "How it works", tr: "Nasıl çalışır?", ar: "كيف يعمل؟", ru: "Как это работает" })}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {tt({
                de: "Drei Schritte. Kein Excel. Kein Papier.",
                en: "Three steps. No Excel. No paper.",
                tr: "Üç adım. Excel yok. Kağıt yok.",
                ar: "ثلاث خطوات. لا Excel. لا ورق.",
                ru: "Три шага. Без Excel. Без бумаги.",
              })}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="relative rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: tt({ de: "Made in Germany", en: "Made in Germany", tr: "Made in Germany", ar: "صُنع في ألمانيا", ru: "Made in Germany" }),
                desc: tt({ de: "Hosting in der EU", en: "Hosted in the EU", tr: "AB'de barındırılır", ar: "استضافة في الاتحاد الأوروبي", ru: "Хостинг в ЕС" }),
              },
              {
                icon: Lock,
                title: tt({ de: "DSGVO-konform", en: "GDPR-compliant", tr: "GDPR uyumlu", ar: "متوافق مع GDPR", ru: "Соответствие GDPR" }),
                desc: tt({ de: "Keine Daten an Dritte", en: "No data sold to third parties", tr: "Üçüncü taraflara veri yok", ar: "لا تُباع لأطراف ثالثة", ru: "Никаких передач третьим лицам" }),
              },
              {
                icon: ShieldCheck,
                title: tt({ de: "GoBD-konform", en: "GoBD-compliant", tr: "GoBD uyumlu", ar: "متوافق مع GoBD", ru: "GoBD-совместимо" }),
                desc: tt({ de: "Revisionssicher mit Festschreibung", en: "Audit-proof with locking", tr: "Kilitleme ile denetim güvenli", ar: "آمن للتدقيق", ru: "Аудит-готов с фиксацией" }),
              },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <t.icon className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              {tt({ de: "Einfache Preise", en: "Simple pricing", tr: "Basit fiyatlandırma", ar: "تسعير بسيط", ru: "Простые цены" })}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {tt({
                de: "Starte kostenlos. Upgrade jederzeit. Monatlich kündbar.",
                en: "Start free. Upgrade anytime. Cancel monthly.",
                tr: "Ücretsiz başla. İstediğinde yükselt. Aylık iptal.",
                ar: "ابدأ مجاناً. ترقّ متى شئت. إلغاء شهري.",
                ru: "Начни бесплатно. Обновляй когда угодно. Отмена ежемесячно.",
              })}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={p.featured ? "border-2 border-primary shadow-lg relative" : "border-2"}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {tt({ de: "Beliebt", en: "Popular", tr: "Popüler", ar: "شائع", ru: "Популярно" })}
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="mb-1 text-sm font-semibold text-muted-foreground">{p.name}</div>
                  <div className="mb-1 text-3xl font-bold">
                    {p.price}
                    <span className="text-base font-normal text-muted-foreground">
                      {tt({ de: " /Monat", en: " /month", tr: " /ay", ar: " /شهر", ru: " /мес." })}
                    </span>
                  </div>
                  <div className="mb-4 text-sm text-muted-foreground">{p.tagline}</div>
                  <ul className="mb-6 space-y-2">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={p.featured ? "default" : "outline"} asChild>
                    <Link to="/auth">
                      {tt({ de: "Kostenlos starten", en: "Start free", tr: "Ücretsiz başla", ar: "ابدأ مجاناً", ru: "Начать бесплатно" })}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="link" asChild>
              <Link to="/auth">
                {tt({ de: "Alle Pläne ansehen", en: "See all plans", tr: "Tüm planları gör", ar: "عرض كل الخطط", ru: "Все тарифы" })}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h2 className="mb-8 text-3xl font-bold md:text-4xl">
            {tt({ de: "Häufige Fragen", en: "Frequently asked", tr: "Sık sorulanlar", ar: "الأسئلة الشائعة", ru: "Частые вопросы" })}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="text-3xl font-bold md:text-4xl">
            {tt({
              de: "Heute starten. 15 Stunden im Monat gewinnen.",
              en: "Start today. Reclaim 15 hours per month.",
              tr: "Bugün başla. Ayda 15 saat kazan.",
              ar: "ابدأ اليوم. استرجع 15 ساعة شهريًا.",
              ru: "Начни сегодня. Верни 15 часов в месяц.",
            })}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {tt({
              de: "7 Scans kostenlos. Keine Kreditkarte. Monatlich kündbar.",
              en: "7 scans free. No credit card. Cancel monthly.",
              tr: "7 tarama ücretsiz. Kart yok. Aylık iptal.",
              ar: "7 عمليات مسح مجانًا. بدون بطاقة. إلغاء شهري.",
              ru: "7 сканов бесплатно. Без карты. Отмена ежемесячно.",
            })}
          </p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link to="/auth">
                {tt({ de: "Kostenlos starten", en: "Start free", tr: "Ücretsiz başla", ar: "ابدأ مجاناً", ru: "Начать бесплатно" })}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center space-x-4">
        <Link to="/demo" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {tt({ de: "Für Steuerberater", en: "For Tax Advisors", tr: "Vergi danışmanları için", ar: "للمستشارين الضريبيين", ru: "Для налоговых консультантов" })}
        </Link>
        <Link to="/impressum" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Impressum
        </Link>
        <Link to="/datenschutz" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {tt({ de: "Datenschutz", en: "Privacy", tr: "Gizlilik", ar: "الخصوصية", ru: "Конфиденциальность" })}
        </Link>
      </footer>
    </div>
  );
};

export default Landing;
