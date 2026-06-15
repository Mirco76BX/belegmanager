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
  Building2,
  Receipt,
  HeartPulse,
  Plane,
  Folder,
} from "lucide-react";
import receiptScanImg from "@/assets/receipt-scan.jpg";
import benefitTimeImg from "@/assets/benefit-time.jpg";
import benefitOrderImg from "@/assets/benefit-order.jpg";
import benefitCostImg from "@/assets/benefit-cost.jpg";

const Landing = () => {
  const { tt } = useLanguage();

  const benefits = [
    {
      img: benefitTimeImg,
      kpi: tt({ de: "−15 h", en: "−15 h", tr: "−15 sa", ar: "−15 س", ru: "−15 ч" }),
      title: tt({
        de: "Zeit zurück",
        en: "Time back",
        tr: "Zaman geri",
        ar: "وقت مُستعاد",
        ru: "Время назад",
      }),
      desc: tt({
        de: "15 Stunden pro Monat, die nicht mehr in die Belegerfassung fließen.",
        en: "15 hours per month no longer lost to receipt entry.",
        tr: "Ayda 15 saat artık fiş girişine harcanmıyor.",
        ar: "15 ساعة شهريًا لم تعد تُهدر في إدخال الإيصالات.",
        ru: "15 часов в месяц больше не уходят на ввод чеков.",
      }),
    },
    {
      img: benefitOrderImg,
      kpi: tt({ de: "0", en: "0", tr: "0", ar: "0", ru: "0" }),
      title: tt({
        de: "Kein Schuhkarton mehr",
        en: "No more shoebox",
        tr: "Ayakkabı kutusu yok",
        ar: "لا صندوق أحذية بعد الآن",
        ru: "Никаких коробок",
      }),
      desc: tt({
        de: "Belege landen sofort sortiert im System – nicht erst im März im Karton.",
        en: "Receipts land sorted in the system instantly – not in a box come March.",
        tr: "Fişler anında sınıflandırılmış olarak sisteme düşer.",
        ar: "تصل الإيصالات مصنّفة فورًا إلى النظام.",
        ru: "Чеки сразу попадают в систему отсортированными.",
      }),
    },
    {
      img: benefitCostImg,
      kpi: tt({ de: "−€€€", en: "−€€€", tr: "−€€€", ar: "−€€€", ru: "−€€€" }),
      title: tt({
        de: "Weniger Steuerberater-Stunden",
        en: "Fewer advisor hours",
        tr: "Daha az müşavir saati",
        ar: "ساعات أقل لدى المستشار",
        ru: "Меньше часов у консультанта",
      }),
      desc: tt({
        de: "Vorsortiert und DATEV-ready übergeben – die Rechnung deines Beraters wird spürbar kleiner.",
        en: "Hand over pre-sorted and DATEV-ready – your advisor's invoice shrinks noticeably.",
        tr: "Önceden sınıflandırılmış ve DATEV-hazır teslim – müşavir faturası küçülür.",
        ar: "تسليم منظّم وجاهز لـ DATEV – تنخفض فاتورة المستشار بوضوح.",
        ru: "Передача отсортированно и в DATEV — счёт консультанта заметно меньше.",
      }),
    },
  ];


  const personas = [
    {
      icon: Briefcase,
      title: tt({
        de: "Unternehmer & Inhaber",
        en: "Entrepreneurs & owners",
        tr: "Girişimciler ve sahipler",
        ar: "رواد الأعمال والمُلّاك",
        ru: "Предприниматели и владельцы",
      }),
      plan: "PRO / BUSINESS",
      featured: true,
      desc: tt({
        de: "Für alle, die sich den Papierkram vom Leib halten wollen. Beleg fotografieren, Rest erledigt die App – inkl. DATEV-Übergabe an deinen Steuerberater. Du bleibst im operativen Geschäft, nicht in der Schuhkarton-Buchhaltung.",
        en: "For owners who want paperwork off their back. Snap the receipt, the app handles the rest — including DATEV handover to your tax advisor. You stay in the business, not in the shoebox.",
        tr: "Evrak işlerinden uzak durmak isteyen sahipler için. Fişi çek, gerisini uygulama halletsin – DATEV teslimi dahil.",
        ar: "لأصحاب الأعمال الذين يريدون التخلّص من الأوراق. صوّر الإيصال، والتطبيق يتكفّل بالباقي – بما في ذلك تسليم DATEV.",
        ru: "Для владельцев, которым бумаги не нужны под боком. Сфотографируй чек — приложение делает остальное, включая передачу DATEV.",
      }),
    },
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
        de: "Belege, Reisekosten und Fahrten an einem Ort. PRO mit unbegrenzten Scans und Multi-Mandant.",
        en: "Receipts, expenses and trips in one place. PRO with unlimited scans and multi-client.",
        tr: "Fişler, masraflar, seyahatler tek yerde. PRO sınırsız tarama.",
        ar: "الإيصالات والمصاريف والرحلات في مكان واحد. PRO بمسح غير محدود.",
        ru: "Чеки, расходы, поездки в одном месте. PRO — безлимит.",
      }),
    },
    {
      icon: Calculator,
      title: tt({
        de: "Dein Steuerberater",
        en: "Your tax advisor",
        tr: "Mali müşaviriniz",
        ar: "مستشارك الضريبي",
        ru: "Ваш налоговый консультант",
      }),
      plan: tt({ de: "Kostenlos", en: "Free", tr: "Ücretsiz", ar: "مجاناً", ru: "Бесплатно" }),
      desc: tt({
        de: "Kostenloser Zugang. Greift per Magic-Link auf deine Belege zu, holt sich den DATEV-Export selbst. Schluss mit Mail-Anhängen und Rückfragen.",
        en: "Free access. Pulls receipts via magic-link and grabs the DATEV export directly. No more email attachments or follow-ups.",
        tr: "Ücretsiz erişim. Magic-link ile fişlere erişir, DATEV dışa aktarımı kendisi alır.",
        ar: "وصول مجاني. يصل إلى الإيصالات عبر رابط سحري ويأخذ تصدير DATEV بنفسه.",
        ru: "Бесплатный доступ. Забирает чеки и DATEV-экспорт по magic-link сам.",
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
        de: "Datum, Betrag, MwSt., Lieferant und Kategorie – automatisch. Sogar Fremdwährung.",
        en: "Date, amount, VAT, vendor and category — automatically. Even foreign currency.",
        tr: "Tarih, tutar, KDV, satıcı ve kategori – otomatik. Yabancı para birimi bile.",
        ar: "التاريخ والمبلغ والضريبة والمورّد والفئة – تلقائيًا. حتى العملات الأجنبية.",
        ru: "Дата, сумма, НДС, поставщик и категория — автоматически. Даже иностранная валюта.",
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
                  de: "3 Minuten pro Woche statt 15 Stunden im Monat.",
                  en: "3 minutes a week instead of 15 hours a month.",
                  tr: "Ayda 15 saat yerine haftada 3 dakika.",
                  ar: "3 دقائق أسبوعيًا بدل 15 ساعة شهريًا.",
                  ru: "3 минуты в неделю вместо 15 часов в месяц.",
                })}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {tt({
                de: "Fotografieren. Erledigt. DATEV-fertig für den Steuerberater.",
                en: "Snap it. Done. DATEV-ready for your tax advisor.",
                tr: "Çek. Bitti. Müşavir için DATEV-hazır.",
                ar: "صوّر. انتهى. جاهز لـ DATEV للمستشار.",
                ru: "Сфотографируй. Готово. DATEV-готово для консультанта.",
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
              {tt({
                de: "Weniger Aufwand. Weniger Chaos. Weniger Kosten.",
                en: "Less work. Less chaos. Lower costs.",
                tr: "Daha az iş. Daha az kaos. Daha az maliyet.",
                ar: "جهد أقل. فوضى أقل. تكلفة أقل.",
                ru: "Меньше работы. Меньше хаоса. Меньше расходов.",
              })}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((b, i) => (
              <Card key={i} className="overflow-hidden border-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={b.img}
                    alt={b.title}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2.5 py-1 text-sm font-bold text-foreground backdrop-blur">
                    {b.kpi}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold md:text-3xl">
              {tt({
                de: "Für jeden Beleg den richtigen Topf.",
                en: "Every receipt in the right bucket.",
                tr: "Her fişi doğru kovaya.",
                ar: "كل إيصال في مكانه الصحيح.",
                ru: "Каждый чек — в свою папку.",
              })}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tt({
                de: "Firma, Privat, Krankenkasse, Reise – getrennt erfasst, sauber exportierbar.",
                en: "Business, private, health insurance, travel – captured separately, cleanly exportable.",
                tr: "Şirket, özel, sağlık sigortası, seyahat – ayrı tutulur, temiz dışa aktarılır.",
                ar: "شركة، خاص، تأمين صحي، سفر – مفصولة ومُصدَّرة بنظافة.",
                ru: "Бизнес, личное, страховка, поездки — раздельно и аккуратно для экспорта.",
              })}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Building2,
                title: tt({ de: "Firmenbelege", en: "Business receipts", tr: "Şirket fişleri", ar: "إيصالات الشركة", ru: "Бизнес-чеки" }),
                desc: tt({ de: "DATEV-Struktur, BU-Schlüssel, Buchungstexte.", en: "DATEV structure, posting keys, booking texts.", tr: "DATEV yapısı, kayıt anahtarları.", ar: "هيكل DATEV ومفاتيح الترحيل.", ru: "Структура DATEV, ключи проводок." }),
              },
              {
                icon: Receipt,
                title: tt({ de: "Steuererklärung", en: "Tax return", tr: "Vergi beyanı", ar: "الإقرار الضريبي", ru: "Налоговая декларация" }),
                desc: tt({ de: "Werbungskosten, Sonderausgaben, haushaltsnah.", en: "Work expenses, special expenses, household.", tr: "Mesleki ve özel giderler.", ar: "نفقات العمل والنفقات الخاصة.", ru: "Расходы по работе и спецрасходы." }),
              },
              {
                icon: HeartPulse,
                title: tt({ de: "Krankenkasse", en: "Health insurance", tr: "Sağlık sigortası", ar: "التأمين الصحي", ru: "Мед. страховка" }),
                desc: tt({ de: "Rezepte, Atteste, Erstattungsbelege gebündelt.", en: "Prescriptions, certificates, reimbursements bundled.", tr: "Reçeteler ve geri ödeme belgeleri.", ar: "وصفات وشهادات وإيصالات استرداد.", ru: "Рецепты и чеки на возмещение." }),
              },
              {
                icon: Plane,
                title: tt({ de: "Reise & Bewirtung", en: "Travel & meals", tr: "Seyahat ve ağırlama", ar: "السفر والضيافة", ru: "Поездки и питание" }),
                desc: tt({ de: "Hotel, Taxi, Restaurant – mit Pflichtfeldern.", en: "Hotel, taxi, restaurant – with required fields.", tr: "Otel, taksi, restoran – zorunlu alanlarla.", ar: "فنادق وسيارات أجرة ومطاعم بحقول إلزامية.", ru: "Отели, такси, рестораны — с обязательными полями." }),
              },
            ].map((u, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <u.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{u.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {tt({
              de: "…und mehr: Vereine, Fahrtkosten, Tankquittungen.",
              en: "…and more: associations, mileage, fuel receipts.",
              tr: "…ve daha fazlası: dernekler, yol giderleri, yakıt fişleri.",
              ar: "…والمزيد: الجمعيات، المسافات، إيصالات الوقود.",
              ru: "…и больше: объединения, пробег, чеки на топливо.",
            })}
          </p>
        </div>
      </section>

      {/* FOR WHOM */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              {tt({ de: "Für wen?", en: "For whom?", tr: "Kimler için?", ar: "لمن؟", ru: "Для кого?" })}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {tt({
                de: "Gebaut für Unternehmer, die sich den Papierkram vom Leib halten wollen – ohne den Überblick zu verlieren.",
                en: "Built for entrepreneurs who want paperwork off their back — without losing the overview.",
                tr: "Evrak işlerinden uzak durmak isteyen girişimciler için – kontrolü kaybetmeden.",
                ar: "مصمَّم لرواد الأعمال الذين يريدون التخلّص من الأوراق دون فقدان الرؤية.",
                ru: "Для предпринимателей, которым бумаги не нужны под рукой — но контроль остаётся.",
              })}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {personas.map((p, i) => (
              <Card key={i} className={p.featured ? "border-primary ring-1 ring-primary/40 shadow-md" : ""}>
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
