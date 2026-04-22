import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Datenschutz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(from)}>
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>

        <h1 className="mb-8 text-3xl font-bold text-foreground">Datenschutzerklärung</h1>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">
          {/* 1. Datenschutz auf einen Blick */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">1. Datenschutz auf einen Blick</h2>

            <h3 className="mt-4 mb-1 font-semibold">Allgemeine Hinweise</h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Datenerfassung auf dieser Website</h3>
            <p className="font-medium mt-2">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</p>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
              Kontaktdaten können Sie dem{" "}
              <Link to="/impressum" state={{ from: location.pathname }} className="text-primary hover:underline">
                Impressum
              </Link>{" "}
              dieser Website entnehmen.
            </p>

            <p className="font-medium mt-3">Wie erfassen wir Ihre Daten?</p>
            <p>
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen, z.&nbsp;B. durch
              Registrierung, Kontaktformulare oder das Hochladen von Belegen. Andere Daten werden
              automatisch beim Besuch der Website durch unsere IT-Systeme erfasst (z.&nbsp;B. technische Daten
              wie Browsertyp oder Zeitpunkt des Seitenaufrufs).
            </p>

            <p className="font-medium mt-3">Wofür nutzen wir Ihre Daten?</p>
            <p>
              Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website und der
              BelegManager-App zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens
              verwendet werden. Hochgeladene Belege werden ausschließlich zur Verarbeitung im Rahmen der
              App-Funktionalität verwendet.
            </p>

            <p className="font-medium mt-3">Welche Rechte haben Sie bezüglich Ihrer Daten?</p>
            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck
              Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die
              Berichtigung oder Löschung dieser Daten zu verlangen.
            </p>
          </section>

          {/* 2. Verantwortlicher */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">2. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der Datenschutzgesetze, insbesondere der
              EU-Datenschutzgrundverordnung (DSGVO), ist:
            </p>
            <p className="mt-2">
              Anno 76 GmbH<br />
              Hansastr. 30<br />
              44137 Dortmund<br />
              Deutschland
            </p>
            <p className="mt-2">
              Telefon: +49 173 277 3871<br />
              E-Mail:{" "}
              <a href="mailto:m.gruebel@anno76.de" className="text-primary hover:underline">
                m.gruebel@anno76.de
              </a>
            </p>
          </section>

          {/* 3. Hosting */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">3. Hosting</h2>
            <p>
              Diese Website und die BelegManager-App werden extern gehostet. Die personenbezogenen Daten,
              die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Die
              Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an einer zuverlässigen Bereitstellung der Website).
            </p>
          </section>

          {/* 4. Allgemeine Hinweise und Pflichtinformationen */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">4. Allgemeine Hinweise und Pflichtinformationen</h2>

            <h3 className="mt-4 mb-1 font-semibold">Datenschutz</h3>
            <p>
              Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre
              personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften
              sowie dieser Datenschutzerklärung.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
            <p>
              Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine
              formlose Mitteilung per E-Mail an uns.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
            <p>
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer
              Aufsichtsbehörde zu.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Recht auf Datenübertragbarkeit</h3>
            <p>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung
              eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen,
              maschinenlesbaren Format aushändigen zu lassen.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Auskunft, Sperrung, Löschung und Berichtigung</h3>
            <p>
              Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten
              personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Recht auf Einschränkung der Verarbeitung</h3>
            <p>
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
              verlangen.
            </p>
          </section>

          {/* 5. Datenerfassung auf dieser Website */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">5. Datenerfassung auf dieser Website</h2>

            <h3 className="mt-4 mb-1 font-semibold">Server-Log-Dateien</h3>
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in
              Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt:
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Browsertyp und Browserversion</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>

            <h3 className="mt-4 mb-1 font-semibold">Kontaktformular</h3>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben zwecks
              Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese
              Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Registrierung und Nutzerkonto</h3>
            <p>
              Bei der Registrierung für BelegManager speichern wir Ihre E-Mail-Adresse und ggf. Ihren
              Namen. Diese Daten werden zur Bereitstellung des Benutzerkontos und der App-Funktionen
              verwendet. Hochgeladene Belege werden verschlüsselt gespeichert und nur für den jeweiligen
              Nutzer zugänglich gemacht.
            </p>
          </section>

          {/* 6. Drittanbieter */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">6. Drittanbieter und externe Dienste</h2>

            <h3 className="mt-4 mb-1 font-semibold">Authentifizierung (Google OAuth)</h3>
            <p>
              Wir bieten die Möglichkeit, sich über Google anzumelden. Dabei werden Daten (E-Mail-Adresse,
              Name) von Google an uns übermittelt. Die Datenverarbeitung erfolgt auf Grundlage von Art. 6
              Abs. 1 lit. a DSGVO (Einwilligung).
            </p>

            <h3 className="mt-4 mb-1 font-semibold">Zahlungsabwicklung (Stripe)</h3>
            <p>
              Für die Zahlungsabwicklung nutzen wir Stripe. Stripe verarbeitet Ihre Zahlungsdaten gemäß
              eigener Datenschutzbestimmungen:{" "}
              <a
                href="https://stripe.com/de/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://stripe.com/de/privacy
              </a>
            </p>

            <h3 className="mt-4 mb-1 font-semibold">KI-gestützte Belegerkennung</h3>
            <p>
              Hochgeladene Belege werden zur automatisierten Erkennung an einen KI-Dienst übermittelt.
              Die Verarbeitung erfolgt ausschließlich zum Zweck der Datenextraktion und die Bilddaten
              werden nicht dauerhaft beim Drittanbieter gespeichert.
            </p>
          </section>

          {/* 7. Cookies */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">7. Cookies</h2>
            <p>
              Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Textdateien und
              richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die
              Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät
              gespeichert. Wir verwenden ausschließlich technisch notwendige Cookies für die
              Authentifizierung und Sitzungsverwaltung.
            </p>
          </section>

          {/* 8. SSL/TLS */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">8. SSL- bzw. TLS-Verschlüsselung</h2>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher
              Inhalte eine SSL- bzw. TLS-Verschlüsselung.
            </p>
          </section>

          {/* 9. Änderung */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">9. Änderung dieser Datenschutzerklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen
              rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der
              Datenschutzerklärung umzusetzen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
