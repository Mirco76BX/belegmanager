/**
 * Design-System-Sandbox für BelegManager.
 *
 * Erreichbar unter /styleguide (nicht im Menü verlinkt).
 * Hier sehen wir alle Komponenten an einem Ort, um Konsistenz zu prüfen,
 * bevor wir die Hauptseiten umstellen.
 *
 * Referenz: Revolut Business + Apple HIG.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Receipt, FileSpreadsheet, Send, ScanLine, Building2,
  TrendingUp, ChevronRight, Search, Filter,
} from "lucide-react";

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-title-2 font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-subhead text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const Swatch = ({ name, css, hint }: { name: string; css: string; hint?: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
    <div className={`h-10 w-10 rounded-md ${css}`} />
    <div className="min-w-0 flex-1">
      <p className="text-headline">{name}</p>
      {hint && <p className="text-footnote text-muted-foreground">{hint}</p>}
    </div>
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
    <span className="text-footnote text-muted-foreground min-w-[120px]">{label}</span>
    <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
  </div>
);

// ─── DEMO-DATEN für Listen-Beispiele ───
const sampleReceipts = [
  { id: "1", date: "26.05.2026", desc: "Schäfers Backstuben — Bakery/cafe", org: "Bakerix GmbH", amount: 25.5, status: "ready" as const, kategorie: "Bewirtung" },
  { id: "2", date: "21.05.2026", desc: "Tabak Vogt — Cigarettes", org: "Anno 76 GmbH", amount: 100.88, status: "incomplete" as const, kategorie: "Sonstiges" },
  { id: "3", date: "16.05.2026", desc: "CAFE DEL SOL — Restaurant", org: "Bakerix GmbH", amount: 157, status: "exported" as const, kategorie: "Bewirtung" },
  { id: "4", date: "01.05.2026", desc: "Amankila Restaurant", org: "Anno 76 GmbH", amount: 199.81, status: "ready" as const, kategorie: "Bewirtung", forex: "4.077.700 IDR" },
];

const statusStyle = {
  ready:       { label: "Bereit", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  incomplete:  { label: "Unvollständig", classes: "bg-amber-50 text-amber-800 border border-amber-200" },
  exported:    { label: "Festgeschrieben", classes: "bg-slate-100 text-slate-700 border border-slate-200" },
};

export default function StyleGuide() {
  const [search, setSearch] = useState("");
  const [activeMandant, setActiveMandant] = useState<"all" | "bakerix" | "anno76">("all");

  return (
    <div className="space-y-12 pb-16">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-caption-1 uppercase tracking-wider text-muted-foreground">Design System · v0.1</p>
        <h1 className="text-large-title font-bold tracking-tight">Style Guide</h1>
        <p className="text-body text-muted-foreground">
          Komponenten und Tokens nach <strong>Revolut Business</strong> + <strong>Apple HIG</strong>.
          Diese Seite ist die Wahrheit — wenn etwas nicht hier dokumentiert ist, gibt es das nicht.
        </p>
      </header>

      {/* ═════ TYPOGRAFIE ═════ */}
      <Section title="Typografie" subtitle="iOS Dynamic-Type-Skala. Body = 17px (nicht mehr 14px!).">
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-large-title font-bold">Large Title · 34px</p>
            <p className="text-title-1 font-bold">Title 1 · 28px</p>
            <p className="text-title-2 font-bold">Title 2 · 22px</p>
            <p className="text-title-3 font-semibold">Title 3 · 20px</p>
            <p className="text-headline font-semibold">Headline · 17px Semibold</p>
            <p className="text-body">Body · 17px — Standardgröße für Fließtext, Listen-Items, Inputs</p>
            <p className="text-callout">Callout · 17px</p>
            <p className="text-subhead">Subhead · 15px</p>
            <p className="text-footnote text-muted-foreground">Footnote · 13px — Hilfstexte unter Inputs</p>
            <p className="text-caption-1 text-muted-foreground">Caption 1 · 12px — Metadaten, Labels</p>
            <p className="text-caption-2 text-muted-foreground uppercase tracking-wider">Caption 2 · 11px — Section-Labels</p>
          </CardContent>
        </Card>
      </Section>

      {/* ═════ FARBEN ═════ */}
      <Section title="Farben" subtitle="Semantisch — nicht Hex-Werte direkt verwenden, immer Token!">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Swatch name="Primary" css="bg-primary" hint="Haupt-Aktionen, Brand" />
          <Swatch name="Accent" css="bg-accent" hint="Sekundär-Highlights" />
          <Swatch name="Success" css="bg-success" hint="Bereit / Erfolg" />
          <Swatch name="Warning" css="bg-warning" hint="Unvollständig" />
          <Swatch name="Destructive" css="bg-destructive" hint="Löschen, Fehler" />
          <Swatch name="Muted" css="bg-muted" hint="Background, sekundär" />
        </div>
      </Section>

      {/* ═════ BUTTONS ═════ */}
      <Section title="Buttons" subtitle="Genau 2 Höhen: Primary 52px (h-13), Secondary 44px (h-11).">
        <Card>
          <CardContent className="p-5 space-y-4">
            <Row label="Primary 52px">
              <Button className="h-13 px-6 text-body font-semibold text-primary-foreground">An Steuerberater senden</Button>
            </Row>
            <Row label="Secondary 44px">
              <Button variant="outline" className="h-11 px-5 text-body">Bearbeiten</Button>
            </Row>
            <Row label="Destructive 44px">
              <Button variant="destructive" className="h-11 px-5 text-body">Löschen</Button>
            </Row>
            <Row label="Icon-Button">
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Search className="h-5 w-5" />
              </Button>
            </Row>
            <Row label="Mit Icon">
              <Button className="h-13 px-6 text-body font-semibold text-primary-foreground gap-2">
                <ScanLine className="h-5 w-5" />
                Beleg scannen
              </Button>
            </Row>
          </CardContent>
        </Card>
      </Section>

      {/* ═════ FORM INPUTS ═════ */}
      <Section title="Form-Inputs" subtitle="Inputs mind. 48px (h-12) für komfortable Touch-Targets.">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-subhead font-medium">Suchfeld</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Belege durchsuchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 pl-11 text-body"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-subhead font-medium">Standard-Text-Input</label>
              <Input className="h-12 text-body" placeholder="z.B. 6190" />
              <p className="text-footnote text-muted-foreground">Hilfstext zum Feld in 13px Footnote.</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═════ FILTER-CHIPS (Revolut-Pattern) ═════ */}
      <Section title="Filter-Chips" subtitle="Statt Dropdown für 2–4 Optionen. Schneller, sichtbarer.">
        <Card>
          <CardContent className="p-5">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "all" as const, label: "Alle", count: 13 },
                { key: "bakerix" as const, label: "Bakerix GmbH", count: 8 },
                { key: "anno76" as const, label: "Anno 76 GmbH", count: 5 },
              ].map((m) => {
                const active = activeMandant === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setActiveMandant(m.key)}
                    className={`h-11 px-4 rounded-full text-callout font-medium flex items-center gap-2 border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className={`text-caption-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {m.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═════ STATUS-PILLS ═════ */}
      <Section title="Status-Pills" subtitle="Eindeutige Zustände — Farbe + Label.">
        <Card>
          <CardContent className="p-5 flex gap-3 flex-wrap">
            {(["ready", "incomplete", "exported"] as const).map((s) => (
              <span key={s} className={`px-3 py-1 rounded-full text-footnote font-medium ${statusStyle[s].classes}`}>
                {statusStyle[s].label}
              </span>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* ═════ LISTEN-ITEM (Revolut-Transaktions-Pattern) ═════ */}
      <Section title="Belege-Liste" subtitle="64-72px Item-Höhe, Icon links, Hero-Betrag rechts. Atmungsfähig.">
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {sampleReceipts.map((r) => (
              <li key={r.id}>
                <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted text-left">
                  {/* Icon-Container links */}
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  {/* Mitte */}
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium truncate">{r.desc}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-footnote text-muted-foreground">{r.org}</span>
                      <span className="text-caption-1 text-muted-foreground/60">·</span>
                      <span className="text-footnote text-muted-foreground">{r.date}</span>
                    </div>
                  </div>
                  {/* Rechts */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-body font-semibold font-mono tabular-nums">
                      {r.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    {r.forex && (
                      <span className="text-caption-1 text-muted-foreground font-mono">{r.forex}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-caption-2 font-medium ${statusStyle[r.status].classes}`}>
                      {statusStyle[r.status].label}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {/* ═════ STAT-CARDS ═════ */}
      <Section title="Hero-Stat-Cards" subtitle="Tappbar, große Number, Trend-Indikator.">
        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-2xl border bg-card p-4 text-left active:bg-muted">
            <div className="flex items-center justify-between mb-3">
              <span className="text-footnote text-muted-foreground">Belege gesamt</span>
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-title-1 font-bold">42</p>
            <p className="text-footnote text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +12% vs. Vormonat
            </p>
          </button>
          <button className="rounded-2xl border bg-card p-4 text-left active:bg-muted">
            <div className="flex items-center justify-between mb-3">
              <span className="text-footnote text-muted-foreground">Brutto Mai</span>
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-title-1 font-bold font-mono tabular-nums">585,69 €</p>
            <p className="text-footnote text-muted-foreground mt-1">5 Belege bereit</p>
          </button>
        </div>
      </Section>

      {/* ═════ SETTINGS-GROUP (iOS-Pattern) ═════ */}
      <Section title="Settings-Gruppen" subtitle="iOS-Settings-Look: gruppierte Listen mit gerundeten Ecken.">
        <div>
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground px-4 mb-2">Mandanten-Stammdaten</p>
          <div className="rounded-xl border bg-card overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 text-left border-b">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-body">Bakerix GmbH</p>
                <p className="text-footnote text-muted-foreground">Berater 6190 · Mandant 40348 · SKR 04</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 text-left">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-body">Anno 76 GmbH</p>
                <p className="text-footnote text-muted-foreground">Berater 6190 · Mandant 40170 · SKR 04</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </button>
          </div>
        </div>
      </Section>

      {/* ═════ EMPTY STATE ═════ */}
      <Section title="Empty State" subtitle="Nicht leer lassen — Aufforderung mit Primary-CTA.">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-title-3 font-semibold">Noch keine Belege</p>
              <p className="text-subhead text-muted-foreground">Scanne deinen ersten Beleg, um zu starten.</p>
            </div>
            <Button className="h-13 px-6 text-body font-semibold text-primary-foreground gap-2">
              <ScanLine className="h-5 w-5" />
              Beleg scannen
            </Button>
          </CardContent>
        </Card>
      </Section>

      {/* ═════ ACTION BAR (Sticky Footer) ═════ */}
      <Section title="Action-Bar (Bottom-Sheet)" subtitle="Eine Primary-CTA, Rest im Overflow.">
        <div className="rounded-2xl border bg-card p-3 flex items-center gap-2">
          <Button className="h-13 flex-1 text-body font-semibold text-primary-foreground gap-2">
            <Send className="h-5 w-5" />
            An Steuerberater senden
          </Button>
          <Button variant="outline" size="icon" className="h-13 w-13" aria-label="Mehr Aktionen">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </Section>

      {/* ═════ FOOTER-HINWEIS ═════ */}
      <footer className="text-center text-footnote text-muted-foreground pt-8">
        Style Guide → wenn dir hier was nicht passt, sag es vor dem Refactoring der Hauptseiten.
      </footer>
    </div>
  );
}
