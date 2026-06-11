# Datenschutzerklärung

**Stand: Juni 2026 — Entwurf v0.1**

> ⚠️ **Vor Veröffentlichung MUSS ein deutscher Datenschutz-Anwalt prüfen — insbesondere die Subprozessor-Liste, die Drittland-Transfers (Google/USA, Anthropic) und die GoBD/AO-Klauseln. Pflichtangaben nach Art. 13 DSGVO.**

---

## 1. Verantwortlicher

Verantwortlicher im Sinne von Art. 4 Nr. 7 DSGVO ist:

**Anno 76 GmbH**
Hansastr. 30
44137 Dortmund
Telefon: [TODO]
E-Mail: [TODO datenschutz@belegmanager.online]
Vertretungsberechtigter Geschäftsführer: Mirco Michael Grübel

## 2. Datenschutzbeauftragter

[Falls bestellt: Name, Adresse, E-Mail. Anno 76 GmbH muss prüfen, ob nach § 38 BDSG ein DSB zu bestellen ist — Faustregel: ab 20 Beschäftigte mit ständigem Umgang mit personenbezogenen Daten, oder bei Kerntätigkeit der umfangreichen Verarbeitung sensibler Daten. Bei Steuerdaten regelmäßig empfehlenswert.]

## 3. Verarbeitete Daten und Verarbeitungszwecke

### 3.1 Account- und Vertragsdaten
- **Daten**: E-Mail-Adresse, Vor- und Nachname, ggf. Display-Name, Kanzlei-Name (bei Steuerberatern), Steuernummer, USt-ID, Adresse
- **Zweck**: Vertragsabwicklung, Authentifizierung, Support
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- **Speicherdauer**: Dauer der Vertragsbeziehung zzgl. gesetzlicher Aufbewahrungsfristen (insbesondere § 147 AO, § 257 HGB — bis zu 10 Jahre)

### 3.2 Belegdaten
- **Daten**: Fotos / Scans von Belegen, Rechnungen, Quittungen, daraus extrahierte Beträge, Datumsangaben, Lieferanten- und Empfängernamen, MwSt-Sätze, Kontoauszüge, Reisekostendaten (Kennzeichen, Kilometerstände)
- **Zweck**: Erfüllung des Hauptzwecks der Anwendung (Belegerfassung, Buchhaltungsunterstützung, DATEV-Export)
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- **Speicherdauer**: Während der Vertragslaufzeit; bei festgeschriebenen Buchungen werden Daten gemäß § 147 AO 8 Jahre aufbewahrt (für ab 01.01.2025 entstandene Belege, BEG IV); ältere Belege gemäß zuvor geltender 10-Jahres-Frist

### 3.3 Mandantendaten (Steuerberater-Modus)
- **Daten**: Belege der Mandanten, Stammdaten der Mandanten, DATEV-Stammdaten (Berater-Nr., Mandanten-Nr., Wirtschaftsjahr, Kontenrahmen)
- **Zweck**: Bereitstellung des Lesezugriffs für den Steuerberater, sofern der Mandant zugestimmt hat
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung des Mandanten zur Freigabe)
- **Steuergeheimnis**: § 30 AO wird durch technische Maßnahmen flankiert (Row-Level-Security, Verschlüsselung); der Steuerberater bleibt jedoch alleinverantwortlich für die organisatorische Wahrung.
- **Speicherdauer**: siehe 3.2; zusätzlich entfällt der Lesezugriff des Steuerberaters mit Beendigung des Mandats oder Widerruf der Einwilligung.

### 3.4 Zahlungsdaten
- **Daten**: Bankverbindung, Kreditkartendaten — werden ausschließlich von **Stripe Payments Europe Ltd.** (Dublin, Irland) verarbeitet; Anno 76 GmbH erhält nur Zahlungsstatus und Identifikatoren
- **Zweck**: Abrechnung von Abonnements und Einmalzahlungen
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
- **Speicherdauer**: Soweit gesetzlich vorgeschrieben (handels- und steuerrechtliche Aufbewahrungspflichten)

### 3.5 Server-Logfiles und technische Daten
- **Daten**: IP-Adresse, User-Agent, Zugriffszeitpunkt, abgerufene Ressource
- **Zweck**: Bereitstellung der Anwendung, Fehleranalyse, Schutz vor Missbrauch
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an IT-Sicherheit)
- **Speicherdauer**: maximal 30 Tage

### 3.6 Steuerberater-Einrichtungs-Tokens (Magic-Link-Funktion)
- **Daten**: E-Mail-Adresse des Steuerberaters, optionaler Name, optionale Notiz des Mandanten, kryptografischer Token-Hash (SHA-256; der Klartext-Token existiert nur in der versendeten Einladungs-Mail und wird nie in unserer Datenbank gespeichert), IP-Adresse und User-Agent des Steuerberaters beim Einlösen (Audit)
- **Zweck**: Mandanten können ihren Steuerberater per Mail einladen, einmalig die DATEV-Stammdaten ihrer Organisation zu konfigurieren — ohne dass der Steuerberater einen Account anlegen oder Belege einsehen muss
- **Rechtsgrundlage**: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse des Mandanten an effizienter DATEV-Konfiguration durch seinen Steuerberater) und Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung)
- **Speicherdauer**: Token-Hash 7 Tage ab Erstellung (Token-Gültigkeit), nach Einlösen oder Ablauf weitere 12 Monate als Audit-Spur (Nachweis ordnungsgemäßer Datenverarbeitung gegenüber Aufsichtsbehörden), danach Löschung
- **Hinweis**: Der Steuerberater hat über die Einladung **ausschließlich Lese-/Schreibzugriff auf die DATEV-Stammdaten der konfigurierten Organisation** — keinerlei Zugriff auf Belege, Buchungen, andere Mandanten oder personenbezogene Daten des Mandanten

## 4. Empfänger / Auftragsverarbeiter

Wir setzen folgende Auftragsverarbeiter ein (Art. 28 DSGVO):

| Anbieter | Sitz | Zweck | Vertrag |
|---|---|---|---|
| **Supabase Inc.** | USA / EU-Server in Frankfurt | Datenbank- und Auth-Hosting | AVV abgeschlossen, Standardvertragsklauseln |
| **Lovable AB** | Schweden | Entwicklungs- und AI-Gateway | AVV abgeschlossen |
| **Google Ireland Ltd. (Gemini API)** | Irland (Verarbeitung teilweise USA) | KI-gestützte Belegerkennung (Vision-Modell „Gemini 2.5 Pro") | Standardvertragsklauseln |
| **Stripe Payments Europe Ltd.** | Irland | Zahlungsabwicklung | AVV gemäß Stripe DPA |
| **Apple Distribution International Ltd.** | Irland | App-Vertrieb über App Store | Apple Developer Program License Agreement |
| **ActiveCampaign LLC (Postmark)** | USA (Chicago, IL) | Transaktionaler E-Mail-Versand (Magic-Links, Bestätigungs-Mails, Passwort-Reset) | Standardvertragsklauseln (EU-SCC 2021/914), Postmark DPA |

Drittlandstransfers in die USA (Google, Stripe, Supabase US-Komponenten) erfolgen auf Basis der EU-Standardvertragsklauseln (2021/914) und/oder des EU-US Data Privacy Frameworks.

## 5. Rechte der Betroffenen

Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:

- **Auskunft** (Art. 15 DSGVO)
- **Berichtigung** (Art. 16 DSGVO)
- **Löschung** (Art. 17 DSGVO) — sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO)
- **Datenübertragbarkeit** (Art. 20 DSGVO)
- **Widerspruch** (Art. 21 DSGVO)

Diese Rechte können Sie geltend machen unter: [TODO datenschutz@belegmanager.online].

Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die **Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen**, Kavalleriestraße 2-4, 40213 Düsseldorf.

## 6. Widerruf von Einwilligungen

Soweit die Verarbeitung auf einer Einwilligung beruht (Art. 6 Abs. 1 lit. a DSGVO), können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.

## 7. Cookies und Tracking

Die mobile App nutzt **keine Tracking-Cookies und keine Werbe-IDFA-Erfassung**. Der für die Authentifizierung erforderliche Session-Token wird ausschließlich im sicheren Local-Storage des Geräts gespeichert.

Auf der Website https://belegmanager.online werden ausschließlich technisch notwendige Cookies (Session-Cookies für Login) eingesetzt. Eine Einwilligung ist hierfür nach § 25 Abs. 2 TTDSG nicht erforderlich.

## 8. Speicherort und IT-Sicherheit

Die Daten werden vorrangig in der EU verarbeitet (Supabase-Server in Frankfurt am Main). Wir setzen Transport-Verschlüsselung (TLS 1.2+) sowie Verschlüsselung at-rest ein. Der Zugriff auf Datenbank-Inhalte ist durch Row-Level-Security beschränkt — jeder Kunde kann ausschließlich seine eigenen Belege einsehen. Mitarbeiter-Zugriffe von Anno 76 GmbH erfolgen nur im Rahmen von Support-Anfragen mit ausdrücklicher Zustimmung des Kunden.

## 9. Aufbewahrung und Löschung

(1) Nach Beendigung des Vertragsverhältnisses werden personenbezogene Daten innerhalb von 30 Tagen gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.

(2) Belege, die nach den GoBD festgeschrieben wurden, unterliegen einer Aufbewahrungspflicht von 8 Jahren (für ab 01.01.2025 entstandene Belege gemäß BEG IV) bzw. 10 Jahren (für ältere Belege). Während dieser Frist werden die Daten in einem revisionssicheren Archivmodus gehalten und nicht aktiv genutzt.

(3) Auf Wunsch des Kunden können wir die Daten auch vorzeitig anonymisieren oder löschen, soweit dies mit Aufbewahrungspflichten vereinbar ist.

## 10. Profiling, automatisierte Entscheidungen

Wir setzen keine automatisierten Einzelentscheidungen im Sinne von Art. 22 DSGVO ein. Die KI-gestützte Belegerkennung (OCR via Gemini 2.5 Pro) hat lediglich Vorschlagscharakter; jede Buchung wird vor Festschreibung vom Kunden überprüft und freigegeben.

## 11. Änderungen dieser Datenschutzerklärung

Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um Änderungen der Rechtslage oder der Verarbeitungsvorgänge Rechnung zu tragen. Die aktuelle Fassung ist jederzeit unter https://belegmanager.online/datenschutz abrufbar.

---

*Anno 76 GmbH, Dortmund — Juni 2026*
