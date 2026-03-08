import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ContactSection from "@/components/ContactSection";
import {
  FileText,
  ScanLine,
  FolderOpen,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  Globe,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Cloud,
  Lock,
} from "lucide-react";
import receiptScanImg from "@/assets/receipt-scan.jpg";

const Demo = () => {
  const { lang, setLang } = useLanguage();
  const de = lang === "de";

  const steps = [
    {
      icon: ScanLine,
      title: de ? "1. Beleg fotografieren" : "1. Snap a receipt",
      desc: de
        ? "Ihr Mandant fotografiert den Beleg mit dem Smartphone – die KI erkennt Betrag, Datum und Beschreibung automatisch."
        : "Your client photographs the receipt with their smartphone – AI automatically detects amount, date, and description.",
    },
    {
      icon: FolderOpen,
      title: de ? "2. Zuordnen & verwalten" : "2. Organize & manage",
      desc: de
        ? "Belege werden Organisationen zugeordnet, mit Bewirtungsangaben ergänzt und übersichtlich gespeichert."
        : "Receipts are assigned to organizations, enriched with hospitality details, and stored clearly.",
    },
    {
      icon: FileSpreadsheet,
      title: de ? "3. Reisekostenabrechnung exportieren" : "3. Export expense reports",
      desc: de
        ? "Per Klick erstellt Ihr Mandant eine fertige Reisekostenabrechnung als PDF – bereit für Ihre Buchhaltung."
        : "With one click, your client generates a ready-to-use expense report as PDF – ready for your accounting.",
    },
  ];

  const benefits = [
    {
      icon: ShieldCheck,
      title: de ? "Weniger Rückfragen" : "Fewer follow-ups",
      desc: de
        ? "Vollständige, digitale Belege mit allen relevanten Informationen – weniger Nachfragen an Mandanten."
        : "Complete, digital receipts with all relevant info – fewer queries to clients.",
    },
    {
      icon: Users,
      title: de ? "Mandantenbindung stärken" : "Strengthen client loyalty",
      desc: de
        ? "Empfehlen Sie ein modernes Tool, das Ihren Mandanten das Leben erleichtert."
        : "Recommend a modern tool that makes life easier for your clients.",
    },
    {
      icon: Cloud,
      title: de ? "Cloud-basiert & sicher" : "Cloud-based & secure",
      desc: de
        ? "Alle Daten verschlüsselt in der Cloud – kein Papierchaos, kein Datenverlust."
        : "All data encrypted in the cloud – no paper chaos, no data loss.",
    },
    {
      icon: Smartphone,
      title: de ? "Optimiert für Mobilgeräte" : "Mobile-optimized",
      desc: de
        ? "Ihre Mandanten scannen Belege direkt unterwegs – die App funktioniert auf jedem Gerät."
        : "Your clients scan receipts on the go – the app works on any device.",
    },
    {
      icon: Lock,
      title: de ? "DSGVO-konform" : "GDPR compliant",
      desc: de
        ? "Datenschutz nach europäischen Standards. Daten werden sicher in Europa gespeichert."
        : "Data protection to European standards. Data is stored securely in Europe.",
    },
    {
      icon: FileText,
      title: de ? "Strukturierte Daten" : "Structured data",
      desc: de
        ? "Saubere, kategorisierte Belege erleichtern Ihren Workflow bei der Steuererklärung."
        : "Clean, categorized receipts streamline your tax filing workflow.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">BelegManager</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(de ? "en" : "de")}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              {de ? "EN" : "DE"}
            </Button>
            <Link to="/auth">
              <Button size="sm">
                {de ? "Jetzt starten" : "Get Started"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                <ShieldCheck className="h-4 w-4" />
                {de ? "Für Steuerberater & deren Mandanten" : "For tax advisors & their clients"}
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {de
                  ? <>Belege digital.<br className="hidden md:block" /> Steuern einfach.</>
                  : <>Receipts digital.<br className="hidden md:block" /> Taxes simple.</>}
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                {de
                  ? "Empfehlen Sie Ihren Mandanten ein Tool, das Belege per KI erfasst, organisiert und als fertige Reisekostenabrechnung exportiert – weniger Papier, weniger Rückfragen, mehr Effizienz."
                  : "Recommend a tool to your clients that captures receipts via AI, organizes them, and exports ready-made expense reports – less paper, fewer queries, more efficiency."}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 px-8">
                    {de ? "Kostenlos testen" : "Try for free"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#so-funktionierts">
                  <Button variant="outline" size="lg">
                    {de ? "So funktioniert's" : "How it works"}
                  </Button>
                </a>
              </div>
            </div>
            <div className="w-full max-w-sm md:max-w-md">
              <div className="relative rounded-2xl shadow-2xl ring-1 ring-border overflow-hidden">
                <img
                  src={receiptScanImg}
                  alt={de ? "Beleg scannen mit dem Smartphone" : "Scanning a receipt with smartphone"}
                  className="w-full"
                  loading="lazy"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5" />
              </div>
            </div>
          </div>
        </div>
        {/* Subtle decorative gradient */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* How it works */}
      <section id="so-funktionierts" className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            {de ? "So funktioniert's" : "How it works"}
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            {de ? "In drei einfachen Schritten vom Beleg zur Abrechnung." : "From receipt to report in three simple steps."}
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="group rounded-xl border-2 border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
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

      {/* Benefits for tax advisors */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
            {de ? "Ihre Vorteile als Steuerberater" : "Your benefits as a tax advisor"}
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            {de
              ? "Warum Ihre Mandanten BelegManager lieben werden – und Sie auch."
              : "Why your clients will love ReceiptManager – and you will too."}
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

      {/* Mandanten-Empfehlung Checkliste */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            {de ? "So empfehlen Sie BelegManager" : "How to recommend ReceiptManager"}
          </h2>
          <p className="mb-10 text-muted-foreground">
            {de
              ? "Teilen Sie einfach den Link zu dieser Seite – Ihre Mandanten können sofort loslegen."
              : "Simply share the link to this page – your clients can start right away."}
          </p>
          <div className="mx-auto max-w-md space-y-4 text-left">
            {(de
              ? [
                  "Senden Sie Ihren Mandanten den Link zur Registrierung",
                  "Mandant registriert sich kostenlos (10 Scans inklusive)",
                  "Belege werden automatisch per KI erfasst",
                  "Fertige Reisekostenabrechnungen als PDF exportieren",
                  "Sie erhalten strukturierte, digitale Belege",
                ]
              : [
                  "Send your clients the registration link",
                  "Client signs up for free (10 scans included)",
                  "Receipts are automatically captured via AI",
                  "Export ready-made expense reports as PDF",
                  "You receive structured, digital receipts",
                ]
            ).map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent mt-0.5" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-8">
                {de ? "Jetzt registrieren" : "Register now"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl space-y-4 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            {de ? "Transparente Preise" : "Transparent Pricing"}
          </h2>
          <p className="text-muted-foreground">
            {de ? "Kostenlos starten – upgraden wenn Sie mehr brauchen." : "Start free – upgrade when you need more."}
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-4xl">
          <PricingPlans compact />
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <ContactSection />
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>BelegManager</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/impressum" className="hover:text-foreground hover:underline">Impressum</Link>
            <Link to="/auth" className="hover:text-foreground hover:underline">
              {de ? "Anmelden" : "Sign In"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
