import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Impressum = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(from)}>
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>

        <h1 className="mb-8 text-3xl font-bold text-foreground">Impressum</h1>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">
          <section>
            <h3 className="mb-2 text-base font-semibold">Angaben gemäß § 5 TMG</h3>
          </section>

          <section>
            <h4 className="font-semibold">Firmenname</h4>
            <p>Anno 76 GmbH</p>
          </section>

          <section>
            <h4 className="font-semibold">Anschrift</h4>
            <p>Hansastr. 30<br />44137 Dortmund<br />Deutschland</p>
          </section>

          <section>
            <h4 className="font-semibold">Rechtsform</h4>
            <p>Gesellschaft mit beschränkter Haftung (GmbH)</p>
          </section>

          <section>
            <h4 className="font-semibold">Vertretungsberechtigter Geschäftsführer</h4>
            <p>Mirco Michael Grübel (alleinvertretungsberechtigt)</p>
          </section>

          <section>
            <h4 className="font-semibold">Registereintrag</h4>
            <p>Registergericht: Amtsgericht Dortmund<br />Handelsregisternummer: HRB 31615</p>
          </section>

          <section>
            <h4 className="font-semibold">Stammkapital</h4>
            <p>25.000,00 EUR</p>
          </section>

          <section>
            <h4 className="font-semibold">Gründungsdatum</h4>
            <p>12. Februar 2020</p>
          </section>

          <section>
            <h4 className="font-semibold">Unternehmensgegenstand</h4>
            <p>Forschung und Entwicklung sowie der Betrieb digitaler Geschäftsmodelle, ferner das Halten und Verwalten mobilen und immobilen Anlagevermögens, die Übernahme von Beteiligungen an Unternehmen, die Unternehmensführung, die Neugründung von Unternehmen sowie die Erbringung von Dienstleistungen für Unternehmen, an denen die Gesellschaft beteiligt ist, wie auch für sonstige Dritte.</p>
          </section>

          <section>
            <h4 className="font-semibold">Kontakt</h4>
            <p>Telefon: +49 173 277 3871<br />E-Mail: <a href="mailto:m.gruebel@anno76.de" className="text-primary hover:underline">m.gruebel@anno76.de</a></p>
          </section>

          <section>
            <h4 className="font-semibold">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h4>
            <p>Mirco Michael Grübel<br />Hansastr. 30<br />44137 Dortmund</p>
          </section>

          <section>
            <h4 className="font-semibold">EU-Streitschlichtung</h4>
            <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
            <p className="mt-1">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
          </section>

          <section>
            <h4 className="font-semibold">Haftung für Inhalte</h4>
            <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
          </section>

          <section>
            <h4 className="font-semibold">Haftung für Links</h4>
            <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.</p>
          </section>

          <section>
            <h4 className="font-semibold">Urheberrecht</h4>
            <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
