# BelegManager Pro — Bedienungsanleitung

**Version 1.0 · Stand: Mai 2026**

Belege scannen, GoBD-konform verwalten, mit einem Klick an DATEV übergeben.

---

## Inhalt

1. [Erste Schritte](#1-erste-schritte)
2. [Belege erfassen](#2-belege-erfassen)
3. [Belege bearbeiten & löschen](#3-belege-bearbeiten--löschen)
4. [Fahrtenbuch](#4-fahrtenbuch)
5. [Reisekostenabrechnung erstellen](#5-reisekostenabrechnung-erstellen)
6. [DATEV-Export im Detail](#6-datev-export-im-detail)
7. [Test- vs. Produktiv-Export (GoBD)](#7-test--vs-produktiv-export-gobd)
8. [Mandanten / Steuerberater-Modus](#8-mandanten--steuerberater-modus)
9. [Datenschutz & GoBD](#9-datenschutz--gobd)
10. [Häufige Fragen](#10-häufige-fragen)

---

## 1. Erste Schritte

### Anmeldung

- **Web-App:** Öffne https://belegmanager.lovable.app im Browser
- **iOS-App:** Über TestFlight oder App Store laden
- Login mit Email + Passwort oder Google-Konto

### Plan wählen

| Plan | Belege pro Monat | Preis |
|---|---|---|
| FREE | 10 | kostenlos |
| RELAX | 150 | 3 €/Monat oder 12 €/Jahr |
| MASTER | unbegrenzt | 6 €/Monat oder 49 €/Jahr |
| STEUERBERATER | bis 50 | gesondert |

DATEV-Export, PDF-Reports und Fahrtenbuch sind ab dem **RELAX-Plan** verfügbar.

---

## 2. Belege erfassen

### Per Foto-Scan (empfohlen)

1. Tippe auf **„Beleg hochladen"** (unten links im Menü)
2. **Foto machen** oder aus der Galerie wählen
3. Die KI erkennt automatisch:
   - Datum, Brutto-Betrag
   - MwSt-Sätze (auch mehrere, z. B. 7 % Speisen + 19 % Getränke)
   - Lieferant / Beschreibung
   - Vorschlag für die Steuer-Kategorie (z. B. „Bewirtung", „Tankkosten")

### Ergänzen, was die KI nicht weiß

Manche Felder musst du selbst ausfüllen — die KI kann sie nicht aus dem Foto ablesen:

- **Bei Bewirtungsbelegen** (Pflicht nach § 4 Abs. 5 EStG):
  - Anlass/Zweck des Meetings
  - Namen der Teilnehmer
- **Organisation/Mandant zuweisen** — falls du mehrere Firmen / Mandanten verwaltest

Speichern → Beleg ist erfasst.

### Manuell ohne Foto

Wenn du keinen Beleg hast (z. B. Eigenbeleg für eine Auslage), tippe nach **„Beleg hochladen"** auf **„Manuell eintragen"** und fülle die Felder selbst aus.

---

## 3. Belege bearbeiten & löschen

### Beleg-Detail öffnen

Tippe in der Beleg-Liste auf eine Zeile → das **Beleg-Detail** öffnet sich mit Foto, allen Daten und Aktions-Buttons.

### Bearbeiten

Klick auf **„Bearbeiten"**. Du kannst nachträglich anpassen:

- **Steuer-Kategorie** (z. B. „Sonstiges" → „Geschenke")
- **Organisation** / Firma
- **Person, Organisation, Zweck** (bei Bewirtungsbelegen)
- **Kennzeichen, Kilometerstand** (bei Tankbelegen)

**Was du NICHT bearbeiten kannst** (per Design read-only):

- **KI-erkannte Kerndaten:** Datum, Betrag, Beschreibung
- **MwSt-Sätze** (im Beleg-Detail sichtbar als „MwSt-Positionen")

Falls die KI sich verlesen hat: Beleg löschen und neu fotografieren.

### Audit-Log

**Jede** Änderung wird automatisch protokolliert: Wer, wann, welches Feld, alter und neuer Wert. Das macht den Steuerberater glücklich — keine Diskussion bei Außenprüfungen.

### Löschen

**„Löschen"** entfernt den Beleg und das Beleg-Foto. **Vorsicht:** Festgeschriebene Belege (siehe Abschnitt 7) lassen sich nicht mehr löschen.

---

## 4. Fahrtenbuch

Im Menü **„Fahrten"** kannst du PKW-Fahrten mit Pauschal-Kilometergeld (0,30 €/km nach § 9 EStG) erfassen:

1. **„Neue Fahrt"** tippen
2. Datum, Strecke (z. B. „Hamburg → Dortmund"), Anlass, gefahrene km
3. Speichern → die App rechnet dir automatisch die Pauschale aus
4. Eintrag wird wie ein normaler Beleg behandelt — taucht in Reports und DATEV-Export auf

---

## 5. Reisekostenabrechnung erstellen

Im Menü **„Report"**:

### Schritt 1: Zeitraum wählen

- Schnellauswahl: „Letzter Monat", „Vorletzter Monat"
- Oder manuell: **Von** und **Bis** als Datum eingeben

### Schritt 2: Organisation filtern (optional)

Wenn du mehrere Mandanten verwaltest, kannst du oben nach Organisation filtern.

### Schritt 3: Export-Format wählen

| Button | Was passiert |
|---|---|
| **PDF** | Reisekostenabrechnung mit Foto-Anhängen, formatiert für die Steuerberatung |
| **CSV** | Einfache Tabelle mit allen Belegen — zur Eigen-Auswertung |
| **DATEV** | Buchungsstapel im DATEV-Format 7 (siehe Abschnitt 6) |

---

## 6. DATEV-Export im Detail

### Wann benutzen?

Wenn dein Steuerberater mit **DATEV Rechnungswesen** oder **DATEV Kanzlei-Rechnungswesen pro** arbeitet (in Deutschland 9 von 10 Kanzleien), kann er deinen Buchungsstapel **direkt importieren** — kein manuelles Abtippen.

### Stammdaten-Dialog

Beim ersten DATEV-Export musst du einmal die Mandanten-Stammdaten eingeben. Diese werden lokal gespeichert und stehen beim nächsten Export wieder bereit.

| Feld | Was bedeutet das? | Wer hat das? |
|---|---|---|
| **Berater-Nr** | Eindeutige Nummer deiner Steuerberatungs-Kanzlei in DATEV | Steuerberater fragen |
| **Mandanten-Nr** | Nummer deiner Firma im System deines Steuerberaters | Steuerberater fragen |
| **Wirtschaftsjahr-Beginn** | Beginn deines aktuellen Geschäftsjahres | meist 1. Januar |
| **Sachkontenlänge** | 4 (Standard) oder mehr | meistens 4 |
| **Kontenrahmen** | SKR 03 (Industrie/Handwerk) oder SKR 04 (modern) | Steuerberater fragen |
| **Gegenkonto** | Womit wurde bezahlt? Bank (1200/1800), Kasse, Privat-Einlage | je nach Bezahlweg |

**Tipp:** Frag deinen Steuerberater einmalig nach diesen Werten. Danach läuft alles automatisch.

### Was passiert im Export?

Aus deinen Belegen wird ein Buchungsstapel im **DATEV-Format 7** generiert:

- **Vorlauf-Zeile** mit Mandanten-Stammdaten (DATEV-Spec-konform)
- **Spalten-Header** (19 Felder)
- **Buchungs-Zeilen:** pro Beleg eine Zeile — bei gemischter MwSt (z. B. Restaurant 7 % + 19 %) **automatisch zwei Zeilen**
- **Automatisches Konten-Mapping** je Steuer-Kategorie:
  - Bewirtung → 4650 (SKR03) / 6640 (SKR04)
  - Tankkosten → 4530 / 6530
  - Reisekosten Übernachtung → 4660 / 6660
  - Reisekosten Fahrtkosten → 4670 / 6670
  - Geschenke → 4630 / 6610
  - Bürobedarf → 4930 / 6815
  - …
- **Fremdwährungs-Belege** bekommen automatisch den **Umrechnungskurs**

### Datei-Encoding

- **Windows-1252** (DATEV-Standard, empfohlen) — funktioniert reibungslos mit DATEV Rechnungswesen
- **UTF-8 with BOM** — falls dein Steuerberater eine andere Software nutzt, die UTF-8 lesen will

### Datei teilen

Nach dem Klick auf **„Festschreiben & exportieren"** (oder „Test-Stapel erstellen"):

- **Web-App:** Datei landet im Downloads-Ordner deines Browsers
- **iOS-App:** **iOS-Share-Sheet** öffnet sich — du kannst die Datei direkt per Mail an den Steuerberater schicken, via AirDrop auf den Mac übertragen, oder in „Dateien" sichern

---

## 7. Test- vs. Produktiv-Export (GoBD)

Hier kommt der **wichtigste Schutzmechanismus** für deine Buchführung:

### 🧪 Test-Modus (Default)

**Wann benutzen?**
- Du willst die Stammdaten ausprobieren
- Du willst Michael (deinem Steuerberater) eine Probe-Datei schicken
- Du willst sehen, wie der Export aussieht, bevor du committest

**Was passiert?**
- Datei wird generiert, Name beginnt mit **`DATEV_TEST_…`** — kein Verwechslungsrisiko
- Belege bleiben **vollständig editierbar**
- KEIN Eintrag in der Festschreibungs-Tabelle
- Kein Schreibschutz, kein Audit-Eintrag „exportiert"

### 🔒 Produktiv-Modus

**Wann benutzen?**
- Wenn dein Steuerberater den Probe-Stapel geprüft hat und sagt „kannst final liefern"
- Wenn du die Belege als „endgültig gebucht" markieren willst

**Was passiert?**
- Datei wird generiert, Name **`DATEV_…`**
- Alle Belege im Export-Zeitraum bekommen Status **„exportiert"**
- Belege sind danach **schreibgeschützt** — kein Bearbeiten, kein Löschen mehr möglich
- DATEV-Stapel wird in der Datenbank dokumentiert (Datum, Mandant, Zeitraum)
- Audit-Eintrag wird automatisch geschrieben
- **GoBD-konform nach § 146 Abs. 4 AO**

### Was tun, wenn ein festgeschriebener Beleg falsch ist?

Nach GoBD darfst du den Original-Beleg nicht ändern. Stattdessen:
1. **Storno-Beleg** anlegen mit dem negativen Betrag und Hinweis auf die Original-Belegnummer
2. **Neuen, korrekten Beleg** erfassen
3. Beim nächsten DATEV-Export gehen Storno und Korrektur als neue Buchungen mit raus
4. Steuerberater bucht das in DATEV, der Saldo bleibt korrekt

Das ist der vorgeschriebene Weg in der Finanzbuchhaltung.

---

## 8. Mandanten / Steuerberater-Modus

Wenn du Steuerberater bist und mehrere Mandanten betreust:

- Im Menü **„Mandanten"** kannst du Mandanten anlegen und einladen
- Jeder Mandant nutzt seinen eigenen BelegManager-Account, lädt aber an deinen Kanzlei-Account aus
- Du siehst alle Belege aller Mandanten zentral in deiner **„Kanzlei-Übersicht"**
- DATEV-Stapel kannst du **pro Mandant** generieren

---

## 9. Datenschutz & GoBD

### Datenschutz

- **Hosting:** Supabase EU-Region (Frankfurt) — alle Daten bleiben in der EU
- **Beleg-Fotos:** verschlüsselt gespeichert, nur du und ggf. dein Steuerberater haben Zugriff
- **DSGVO-konform:** vollständige Datenlöschung auf Anfrage
- Details: siehe https://belegmanager.lovable.app/datenschutz

### GoBD-Konformität

| GoBD-Anforderung | Wie wir das umsetzen |
|---|---|
| Unveränderbarkeit Originalbeleg | Foto-Upload wird unverändert in Storage gespeichert |
| Unveränderbarkeit KI-Daten | Datum, Betrag, MwSt-Sätze sind im Edit-Form read-only |
| Audit-Log | Jede Änderung mit Timestamp, User, Vorher/Nachher in der Tabelle `receipt_changes` |
| Festschreibung | Produktiv-DATEV-Export sperrt den Beleg, DB-Trigger blockt jede weitere Änderung |
| Belegfunktion | Original-Foto bleibt jedem Beleg dauerhaft zugeordnet |

---

## 10. Häufige Fragen

**„Was, wenn das Foto unscharf ist und die KI sich verliest?"**
→ Sieh dir das Beleg-Detail an. Stimmt der Betrag nicht, lösche den Beleg und mach ein besseres Foto.

**„Kann ich mehrere Belege auf einmal scannen?"**
→ Aktuell ein Foto pro Beleg. Das hat Compliance-Gründe (jeder Beleg eindeutig).

**„Wie weit kann die App rückwirkend rechnen?"**
→ Solange du Belege erfasst hast — Reports gehen über beliebige Zeiträume.

**„Mein Steuerberater hat eine andere Software als DATEV"**
→ CSV-Export funktioniert mit jeder gängigen Software (Excel, Lexware, Sage etc.). Bei Bedarf passen wir das Format an — Anfrage an Support.

**„Ich habe das iPhone gewechselt. Sind meine Belege weg?"**
→ Nein. Alle Belege sind in der Cloud, einfach in der App mit demselben Account einloggen.

**„Was kostet das?"**
→ Siehe Abschnitt 1 (Plan wählen) oder https://belegmanager.lovable.app/pricing.

---

**Support:** mirco@bakerix.de
**Version dieser Anleitung:** 1.0 (Mai 2026)
