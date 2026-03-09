import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Truck, Calculator, ArrowRight, Clock, Users, FileText,
  Receipt, Fuel, Wrench, BarChart3, Route,
} from "lucide-react";

const IndustrySolutions = () => {
  const { tt } = useLanguage();

  const solutions = [
    {
      id: "tax_advisor",
      icon: Briefcase,
      color: "bg-primary/10 text-primary",
      title: tt({ de: "Steuerberater", en: "Tax Advisors", tr: "Vergi Danışmanları", ar: "المستشارون الضريبيون", ru: "Налоговые консультанты" }),
      subtitle: tt({ de: "Mandantenbelege digital verwalten", en: "Manage client receipts digitally", tr: "Müşteri fişlerini dijital yönetin", ar: "إدارة إيصالات العملاء رقمياً", ru: "Цифровое управление чеками клиентов" }),
      description: tt({
        de: "Ihre Mandanten scannen Belege per KI – Sie erhalten strukturierte, digitale Unterlagen für die Verbuchung. Weniger Rückfragen, schnellere Abschlüsse.",
        en: "Your clients scan receipts via AI – you receive structured, digital documents for accounting. Fewer follow-ups, faster closings.",
        tr: "Müşterileriniz yapay zeka ile fişleri tarar – muhasebe için yapılandırılmış, dijital belgeler alırsınız.",
        ar: "يمسح عملاؤك الإيصالات بالذكاء الاصطناعي – تحصل على مستندات رقمية منظمة للمحاسبة.",
        ru: "Ваши клиенты сканируют чеки с помощью ИИ – вы получаете структурированные цифровые документы для учёта.",
      }),
      features: [
        { icon: Users, text: tt({ de: "Mandantenverwaltung", en: "Client management", tr: "Müşteri yönetimi", ar: "إدارة العملاء", ru: "Управление клиентами" }) },
        { icon: FileText, text: tt({ de: "Belegflüsse & Verbuchung", en: "Document flows & accounting", tr: "Belge akışları ve muhasebe", ar: "تدفقات المستندات والمحاسبة", ru: "Документооборот и бухгалтерия" }) },
        { icon: Receipt, text: tt({ de: "Digitale Reisekostenabrechnungen", en: "Digital expense reports", tr: "Dijital masraf raporları", ar: "تقارير مصاريف رقمية", ru: "Цифровые отчёты о расходах" }) },
      ],
      cta: tt({ de: "Mehr erfahren", en: "Learn more", tr: "Daha fazla bilgi", ar: "اعرف المزيد", ru: "Узнать больше" }),
      link: "/demo",
    },
    {
      id: "fleet",
      icon: Truck,
      color: "bg-accent/10 text-accent",
      title: tt({ de: "Fuhrunternehmer", en: "Fleet Managers", tr: "Filo Yöneticileri", ar: "مديرو الأساطيل", ru: "Управляющие автопарком" }),
      subtitle: tt({ de: "Fahrtkosten transparent im Blick", en: "Fleet costs at a glance", tr: "Filo maliyetleri bir bakışta", ar: "تكاليف الأسطول في لمحة", ru: "Затраты на автопарк в одном взгляде" }),
      description: tt({
        de: "Tankquittungen, Reparaturbelege und Fahrtkosten zentral erfassen. Volle Transparenz über alle Fahrzeugkosten – für bessere Kalkulationen und Abrechnungen.",
        en: "Centrally capture fuel receipts, repair invoices, and trip costs. Full transparency over all vehicle costs – for better calculations and billing.",
        tr: "Yakıt fişleri, tamir faturaları ve yol masraflarını merkezi olarak kaydedin. Tüm araç maliyetleri üzerinde tam şeffaflık.",
        ar: "تسجيل إيصالات الوقود وفواتير الإصلاح وتكاليف الرحلات مركزياً. شفافية كاملة على جميع تكاليف المركبات.",
        ru: "Централизованный учёт чеков на топливо, ремонт и командировочные расходы. Полная прозрачность затрат на автопарк.",
      }),
      features: [
        { icon: Fuel, text: tt({ de: "Tankquittungen & Kraftstoffkosten", en: "Fuel receipts & costs", tr: "Yakıt fişleri ve maliyetleri", ar: "إيصالات الوقود والتكاليف", ru: "Чеки на топливо и расходы" }) },
        { icon: Wrench, text: tt({ de: "Reparatur- & Wartungsbelege", en: "Repair & maintenance receipts", tr: "Tamir ve bakım belgeleri", ar: "إيصالات الإصلاح والصيانة", ru: "Чеки на ремонт и обслуживание" }) },
        { icon: BarChart3, text: tt({ de: "Kostenübersicht je Fahrzeug", en: "Cost overview per vehicle", tr: "Araç başına maliyet genel bakışı", ar: "نظرة عامة على التكاليف لكل مركبة", ru: "Обзор затрат по транспорту" }) },
      ],
      cta: tt({ de: "Demnächst verfügbar", en: "Coming soon", tr: "Yakında", ar: "قريباً", ru: "Скоро" }),
      link: null,
    },
  ];

  const comingSoon = [
    { icon: Calculator, label: tt({ de: "Kfm. Leiter", en: "Finance Directors", tr: "Finans Direktörleri", ar: "المدراء الماليون", ru: "Финансовые директора" }), hint: tt({ de: "Reisekostenbelege für Consulting & mehr", en: "Expense receipts for consulting & more", tr: "Danışmanlık ve daha fazlası için masraf belgeleri", ar: "إيصالات المصاريف للاستشارات وأكثر", ru: "Командировочные для консалтинга и др." }) },
    { icon: Route, label: tt({ de: "Weitere Branchen", en: "More industries", tr: "Daha fazla sektör", ar: "مزيد من الصناعات", ru: "Другие отрасли" }), hint: tt({ de: "Handwerk, Gastronomie, Pflege u.v.m.", en: "Trades, hospitality, healthcare & more", tr: "Zanaat, gastronomi, sağlık v.d.", ar: "الحرف والضيافة والرعاية الصحية والمزيد", ru: "Ремесло, гастрономия, медицина и др." }) },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">
          {tt({ de: "Branchenlösungen", en: "Industry Solutions", tr: "Sektör Çözümleri", ar: "حلول الصناعة", ru: "Отраслевые решения" })}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {tt({
            de: "BelegManager passt sich Ihrer Branche an – mit spezialisierten Admin-Zugängen für maximale Effizienz.",
            en: "BelegManager adapts to your industry – with specialized admin access for maximum efficiency.",
            tr: "BelegManager sektörünüze uyum sağlar – maksimum verimlilik için özelleştirilmiş yönetici erişimi.",
            ar: "يتكيف مدير الإيصالات مع صناعتك – مع وصول إداري متخصص لأقصى كفاءة.",
            ru: "BelegManager адаптируется к вашей отрасли – со специализированным доступом для максимальной эффективности.",
          })}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
        {solutions.map((sol) => (
          <div key={sol.id} className="relative rounded-2xl border-2 border-border bg-card p-6 md:p-8 flex flex-col transition-shadow hover:shadow-lg">
            {!sol.link && (
              <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                {tt({ de: "Demnächst", en: "Coming soon", tr: "Yakında", ar: "قريباً", ru: "Скоро" })}
              </span>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${sol.color}`}>
                <sol.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{sol.title}</h3>
                <p className="text-sm text-muted-foreground">{sol.subtitle}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{sol.description}</p>
            <ul className="space-y-2.5 flex-1 mb-6">
              {sol.features.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            {sol.link ? (
              <Link to={sol.link}>
                <Button className="w-full gap-2">
                  {sol.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full gap-2" disabled>
                <Clock className="h-4 w-4" />
                {sol.cta}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Coming Soon Teaser */}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <p className="text-center text-sm font-medium text-foreground mb-4">
            {tt({ de: "Weitere Branchenzugänge in Kürze", en: "More industry solutions coming soon", tr: "Daha fazla sektör çözümü yakında", ar: "مزيد من حلول الصناعة قريباً", ru: "Скоро появятся решения для других отраслей" })}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {comingSoon.map((cs) => (
              <div key={cs.label} className="flex items-center gap-2.5 rounded-lg bg-card border border-border px-4 py-2.5">
                <cs.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{cs.label}</p>
                  <p className="text-xs text-muted-foreground">{cs.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustrySolutions;
