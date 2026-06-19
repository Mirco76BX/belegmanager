import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Lock,
  KeyRound,
  UserCheck,
  FileSignature,
  Database,
  FileText,
  Download,
  AlertTriangle,
  Mail,
  Building2,
  Scale,
  Globe2,
  Server,
  HardDrive,
} from "lucide-react";
import trustHero from "@/assets/trust-hero.jpg";
import trustEuHosting from "@/assets/trust-eu-hosting.jpg";
import trustEncryption from "@/assets/trust-encryption.jpg";

const Trust = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <img
          src={trustHero}
          alt=""
          width={1600}
          height={896}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Vertrauen & Sicherheit
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Deine Belege gehören dir. Punkt.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Wir bauen BelegManager so, dass du nie zweifeln musst wo deine Daten sind
            und wer Zugriff hat.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {[
              "🇩🇪 Made in Germany",
              "🇪🇺 EU-Hosting",
              "DSGVO-konform",
              "GoBD-konform",
            ].map((b) => (
              <span
                key={b}
                className="rounded-full border border-border bg-card/80 px-3 py-1.5 font-medium text-foreground backdrop-blur"
              >
                {b}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-xs text-muted-foreground">
            Diese Seite wird von der Anno 76 GmbH gepflegt und beantwortet
            häufige Fragen zu Sicherheit, Datenschutz und Compliance von
            BelegManager. Sie ist keine unabhängige Zertifizierung.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
        {/* Section 1 — Wo */}
        <Section icon={<MapPin className="h-5 w-5" />} title="Wo liegen meine Daten?">
          <ItemList
            items={[
              {
                icon: <Globe2 className="h-4 w-4" />,
                title: "Datenstandort EU",
                desc: "Alle Daten und die Datenbank liegen in der EU (Supabase Frankfurt). Kein Transfer in Drittländer ohne explizite Zustimmung.",
              },
              {
                icon: <Server className="h-4 w-4" />,
                title: "Hosting-Anbieter",
                desc: "Supabase (eingetragen in Irland), Infrastruktur AWS Frankfurt.",
              },
              {
                icon: <HardDrive className="h-4 w-4" />,
                title: "Backups",
                desc: "Täglich automatisch, 30-Tage-Retention.",
              },
            ]}
          />
        </Section>

        {/* Section 2 — Schutz */}
        <Section icon={<Lock className="h-5 w-5" />} title="Wie sind meine Daten geschützt?">
          <ItemList
            items={[
              {
                icon: <Lock className="h-4 w-4" />,
                title: "Verschlüsselung in Transit",
                desc: "TLS 1.3 — HTTPS überall.",
              },
              {
                icon: <Database className="h-4 w-4" />,
                title: "Verschlüsselung at Rest",
                desc: "AES-256 (Postgres-Standard).",
              },
              {
                icon: <UserCheck className="h-4 w-4" />,
                title: "Zugriffskontrolle",
                desc: "Row-Level Security — jeder User sieht nur seine eigenen Belege, technisch garantiert auf Datenbankebene.",
              },
              {
                icon: <KeyRound className="h-4 w-4" />,
                title: "Authentifizierung",
                desc: "E-Mail + Passwort, OAuth (Google) und Magic-Link für Steuerberater.",
              },
              {
                icon: <FileSignature className="h-4 w-4" />,
                title: "Webhook-Signaturen",
                desc: "Alle Zahlungs-Events von Stripe werden signaturverifiziert verarbeitet.",
              },
            ]}
          />
        </Section>

        {/* Section 3 — Sub-Processors */}
        <Section icon={<Server className="h-5 w-5" />} title="Welche externen Dienste nutzen wir?">
          <p className="mb-4 text-sm text-muted-foreground">
            Sub-Processors für DSGVO-Transparenz:
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Dienst</th>
                  <th className="px-4 py-3 text-left font-medium">Zweck</th>
                  <th className="px-4 py-3 text-left font-medium">Standort</th>
                  <th className="px-4 py-3 text-left font-medium">DPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {[
                  ["Supabase", "Datenbank, Auth, File-Storage", "EU (Frankfurt)", "✓"],
                  ["Stripe", "Zahlungsabwicklung", "EU (Irland)", "✓"],
                  ["Lovable", "Hosting, AI-Gateway (OCR)", "EU (Schweden)", "✓"],
                  ["Postmark", "Transaktions-E-Mails", "USA", "✓"],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="px-4 py-3 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row[1]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row[2]}</td>
                    <td className="px-4 py-3 text-primary">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <strong>Hinweis:</strong> Das AI-Gateway für Belegerkennung wird über
            Lovable geroutet — keine direkten Anfragen an OpenAI/Anthropic, kein
            Training mit deinen Daten.
          </p>
        </Section>

        {/* Section 4 — GoBD */}
        <Section icon={<FileSignature className="h-5 w-5" />} title="GoBD-Konformität — was bedeutet das?">
          <ItemList
            items={[
              {
                icon: <Lock className="h-4 w-4" />,
                title: "Festschreibung nach DATEV-Export",
                desc: "Belege werden nach Steuerberater-Übergabe via DATEV-Export technisch festgeschrieben — Manipulation ist nicht möglich.",
              },
              {
                icon: <FileText className="h-4 w-4" />,
                title: "Audit-Trail",
                desc: "Jede Änderung wird mit Zeitstempel und User-ID protokolliert.",
              },
              {
                icon: <Database className="h-4 w-4" />,
                title: "10 Jahre Aufbewahrungsfrist",
                desc: "Gemäß § 147 AO automatisch erfüllt.",
              },
              {
                icon: <Download className="h-4 w-4" />,
                title: "DATEV-Export jederzeit",
                desc: "Format EXTF, Version 7 — kompatibel mit DATEV Rechnungswesen.",
              },
            ]}
          />
        </Section>

        {/* Section 5 — DSGVO */}
        <Section icon={<Scale className="h-5 w-5" />} title="DSGVO-Rechte — was kannst du tun?">
          <ItemList
            items={[
              { icon: "📋", title: "Datenauskunft", desc: "Jederzeit per Mail an datenschutz@bakerix.de." },
              { icon: "✏️", title: "Berichtigung", desc: "Direkt in der App, oder per Mail an uns." },
              { icon: "🗑️", title: "Löschung", desc: "Account-Löschung in den Einstellungen → alle Daten werden binnen 30 Tagen entfernt." },
              { icon: "📦", title: "Datenexport", desc: "Alle Belege als ZIP + Metadaten als JSON." },
              { icon: "⏸️", title: "Widerruf der Einwilligung", desc: "Jederzeit möglich, ohne Angabe von Gründen." },
              { icon: "🇪🇺", title: "Beschwerde bei Aufsichtsbehörde", desc: "Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)." },
            ]}
          />
        </Section>

        {/* Section 6 — Availability */}
        <Section icon={<AlertTriangle className="h-5 w-5" />} title="Verfügbarkeit & Vorfälle">
          <ItemList
            items={[
              {
                icon: <ShieldCheck className="h-4 w-4" />,
                title: "Ziel-Uptime: 99,9 %",
                desc: "Lovable + Supabase SLAs kumuliert.",
              },
              {
                icon: <Globe2 className="h-4 w-4" />,
                title: "Status-Page",
                desc: (
                  <>
                    <a
                      href="https://status.lovable.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      status.lovable.dev
                    </a>{" "}
                    — Lovable-Infrastruktur.
                  </>
                ),
              },
              {
                icon: <AlertTriangle className="h-4 w-4" />,
                title: "Incident-Response",
                desc: "Bei Sicherheits- oder Datenschutz-Vorfall: Benachrichtigung der betroffenen User binnen 72 Stunden (DSGVO Art. 34) und Meldung an die Aufsichtsbehörde.",
              },
            ]}
          />
        </Section>

        {/* Section 7 — Verantwortlich */}
        <Section icon={<Building2 className="h-5 w-5" />} title="Verantwortlich für deine Daten">
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">Betreiber</p>
              <p className="text-muted-foreground">
                Anno 76 GmbH<br />
                Hansastr. 30, 44137 Dortmund<br />
                Deutschland
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Datenschutzbeauftragter</p>
              <p className="text-muted-foreground">
                Extern bestellt — Kontakt:{" "}
                <a href="mailto:datenschutz@bakerix.de" className="text-primary hover:underline">
                  datenschutz@bakerix.de
                </a>
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Geschäftsführer</p>
              <p className="text-muted-foreground">Mirco Michael Grübel</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Handelsregister</p>
              <p className="text-muted-foreground">Amtsgericht Dortmund, HRB 31615</p>
            </div>
          </div>
        </Section>

        {/* Section 8 — Documents */}
        <Section icon={<FileText className="h-5 w-5" />} title="Dokumente zum Download">
          <div className="grid gap-3 sm:grid-cols-2">
            <DocLink to="/datenschutz" label="Datenschutzerklärung" internal />
            <DocLink to="/impressum" label="Impressum" internal />
            <DocLink to="/docs/avv-vorlage.pdf" label="AVV-Vorlage (PDF)" />
            <DocLink to="mailto:trust@bakerix.de?subject=AGB%20anfordern" label="AGB anfordern" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            AVV (Auftragsverarbeitung) ist insbesondere für Steuerberater und
            B2B-Kunden relevant.
          </p>
        </Section>

        {/* CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-8 text-center">
            <Mail className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 text-xl font-bold text-foreground">Noch Fragen?</h3>
            <p className="mb-6 text-muted-foreground">
              Schreib uns an{" "}
              <a href="mailto:trust@bakerix.de" className="text-primary hover:underline">
                trust@bakerix.de
              </a>{" "}
              — wir antworten binnen 24 Stunden.
            </p>
            <Button asChild size="lg">
              <a href="mailto:trust@bakerix.de">Kontakt aufnehmen</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="space-x-4">
          <Link to="/impressum" className="hover:text-foreground hover:underline">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-foreground hover:underline">Datenschutz</Link>
          <Link to="/landing" className="hover:text-foreground hover:underline">Zur Startseite</Link>
        </div>
      </footer>
    </div>
  );
};

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardContent className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
      </div>
      {children}
    </CardContent>
  </Card>
);

const ItemList = ({
  items,
}: {
  items: { icon: React.ReactNode; title: string; desc: React.ReactNode }[];
}) => (
  <ul className="space-y-4">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-primary">
          {it.icon}
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">{it.title}</p>
          <p className="text-muted-foreground">{it.desc}</p>
        </div>
      </li>
    ))}
  </ul>
);

const DocLink = ({
  to,
  label,
  internal,
}: {
  to: string;
  label: string;
  internal?: boolean;
}) => {
  const cls =
    "flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5";
  const content = (
    <>
      <span>{label}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </>
  );
  if (internal) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
      {content}
    </a>
  );
};

export default Trust;
