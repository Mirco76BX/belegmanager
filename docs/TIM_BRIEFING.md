# Tim-Briefing — Pilot-Klärungen mit WSB GmbH

**Stand: Juni 2026**
**Setting**: Tim Färber (Gesellschafter-Geschäftsführer, WP + StB), WSB GmbH Wirtschaftsprüfungs- und Steuerberatungsgesellschaft, Wentorf bei Hamburg
**Nutzung**: Interner Spickzettel für Mirco beim Termin — NICHT vorab an Tim schicken. Er soll erst die App sehen.

---

## Wie WSB sich unterscheidet (vs. do.tax)

- Größere Kanzlei (gegründet 1948), Mittelstand + Privatpersonen
- Tim ist **Wirtschaftsprüfer + Steuerberater** → höhere Compliance-Anforderungen
- Nutzt **DATEV** inkl. „DATEV Unternehmen online" → unser Stack passt 1:1
- Mehrere Mitarbeiter, mehrere Mandanten-Cluster → echter White-Label-Multiplikator (50+ Mandanten realistisch)
- Tim entscheidet nicht allein — andere Partner sind eingebunden

**Ableitung**: Pilot soll **klein und kontrolliert** starten (3-5 Mandanten), aber das Modell-Pricing muss skalieren

---

## 1. DATEV-Format und Schnittstellen

### 1.1 EXTF-Format Nr. 7 (Buchungsstapel)
- **Stand**: Implementiert nach öffentlich zugänglicher Schnittstellenbeschreibung
- **Vorlauf**: 31 Felder, `Festschreibung=0` explizit gesetzt, TTMM-Belegdatum, CRLF + Windows-1252
- **Buchungszeilen**: 116 Felder, komma-dezimal
- **Was klären?**
  - [ ] Testlauf mit echter Mandanten-Datei: hat die DATEV-Importfunktion alles akzeptiert?
  - [ ] Bestimmte Feldwerte (z. B. „Festschreibung", „Gen-Schlüssel", „Sammelposten") final konfigurieren
  - [ ] Soll die App standardmäßig `Festschreibung=0` (offen, Korrekturen möglich) oder `=1` (final festgeschrieben) setzen?

### 1.2 DATEV Unternehmen online
- **Stand**: BelegManager exportiert EXTF — DATEV Unternehmen online akzeptiert das. Belege können zusätzlich als PDF im DATEV-Beleg-Archiv landen
- **Was klären?**
  - [ ] Soll BelegManager Belege parallel ins DATEV-Belegarchiv schieben, oder reicht der EXTF-Stapel?
  - [ ] Schnittstelle: aktiv mit DATEV-Token, oder läuft der Versand klassisch per E-Mail / Upload?

### 1.3 Gegenkonto-Wahl
- **Stand**: Default ist **3300 (Verbindlichkeiten aus L+L) für SKR04** und **1600 für SKR03**
- **Warum nicht 1800/1200 (Bank)?** Bank wird vom Steuerberater regelmäßig automatisiert aus Kontoauszügen importiert. Würde der BelegManager Bank als Gegenkonto setzen, würde der Aufwand bei jeder Buchung doppelt erscheinen.
- **Was klären?**
  - [ ] Bestätigt Tim die Default-Wahl 3300 / 1600?
  - [ ] Gibt es Mandantenkonstellationen, in denen ein anderes Gegenkonto sinnvoller ist (z. B. Bargeld-Kassen)?

### 1.4 Bewirtungsbeleg-Aufteilung
- **Stand**: 70/30-Split: 70 % auf Bewirtungs-Aufwand (6640 SKR04 / 4650 SKR03), 30 % als nicht abziehbar
- **MwSt**: 100 % Vorsteuer (§ 15 Abs. 1 Nr. 1 UStG i. V. m. § 4 Abs. 5 Nr. 2 EStG)
- **Was klären?**
  - [ ] Verfährt WSB bei Bewirtungsbelegen mit der gleichen 70/30-Aufteilung, oder werden 100 % gebucht und die 30 % nur außerbilanziell hinzugerechnet?
  - [ ] Welche Konten verwendet WSB konkret für den nicht abziehbaren 30 %-Anteil?

### 1.5 Multi-MwSt-Belege (z. B. Lebensmittel 7 % + Getränke 19 %)
- **Stand**: BelegManager teilt automatisch in mehrere Buchungszeilen mit korrektem MwSt-Schlüssel
- **Was klären?**
  - [ ] Akzeptiert WSB mehrere Buchungszeilen pro Beleg im DATEV-Stapel?

### 1.6 Trinkgeld
- **Stand**: Wenn Brutto > Summe(MwSt-Items), Differenz kann als „Trinkgeld" mit 0 % MwSt erfasst werden
- **Was klären?**
  - [ ] Bestätigt Tim die steuerliche Behandlung als anerkannte Betriebsausgabe?
  - [ ] Separates Konto (z. B. 6643 „Trinkgelder") gewünscht?

---

## 2. White-Label-Modell für WSB

### 2.1 Branding
- **Idee**: BelegManager als App, die WSB seinen Mandanten zur Verfügung stellt — mit WSB-Logo, Farben, Kontaktangaben
- **Was klären?**
  - [ ] Interesse vorhanden? Wenn ja: zu welchem Preis (pauschal pro Monat? pro Mandant?)
  - [ ] Welche Anpassungen am UI/UX wären für WSB wichtig?
  - [ ] App-Verteilung: über separaten Apple-Account von WSB oder als „White-Label-Konfiguration" innerhalb der BelegManager-App?

### 2.2 Lizenzmodell-Vorschlag (zur Diskussion)
- **Variante A**: 39 €/Monat Berater + 1 €/Monat pro aktivem Mandant
- **Variante B**: 99 €/Monat Pauschale bis 25 Mandanten, +49 €/Monat je weitere 25
- **Variante C**: 199 €/Monat Pauschale bis 100 Mandanten (für größere Kanzleien wie WSB)
- **Variante D**: Lizenz-Sharing: WSB kassiert vom Mandant, Anno 76 erhält 50 %

---

## 3. Pilot-Setup

### 3.1 Erste Pilot-Mandanten
- **Vorschlag**: 3–5 Mandanten aus unterschiedlichen Branchen
- **Profil idealerweise**:
  - 1× Bäckerei oder Lebensmittel-Handwerk (Multi-MwSt + Bewirtungsfälle)
  - 1× Selbstständiger Berater / IT-Freelancer (einfache Belege, viele Reisekosten)
  - 1× Kleiner Handwerksbetrieb (klassische L+L-Belege, regelmäßige Lieferanten)
  - 1× Optional Mandant mit hohem Beleg-Volumen (Test der OCR-Performance unter Last)
- **Was klären?**
  - [ ] Hat Tim konkrete Mandantenvorschläge?
  - [ ] Welches Tier soll Pilot-Mandanten zugewiesen werden? (Vorschlag: BUSINESS-Tier kostenfrei während Pilot)

### 3.2 Onboarding-Begleitung
- Beleg-Erfassung üben (Foto-Aufnahmen, OCR-Korrektur, Status-Workflow)
- DATEV-Stammdaten je Mandant konfigurieren (Berater-Nr. WSB, Mandanten-Nr. individuell, SKR03/SKR04, Wirtschaftsjahr)
- Erstes Monatsende-DATEV-Stapel-Export gemeinsam durchgehen
- **Was klären?**
  - [ ] Wer übernimmt die Mandanten-Schulung — Tim, Anno 76, oder gemeinsam?
  - [ ] Wer ist Eskalations-Ansprechpartner bei Bugs?

---

## 4. Vertragsstruktur

### 4.1 AVV mit WSB
- Steuerberater = Verantwortlicher, Anno 76 = Auftragsverarbeiter
- AVV-Entwurf liegt in `docs/AVV.md`
- **Was klären?**
  - [ ] Hat WSB bereits AVV-Standardklauseln, die übernommen werden sollen?
  - [ ] Muss WSB-interne Datenschutz-Beauftragte involviert werden? (Bei Kanzlei dieser Größe wahrscheinlich ja)

### 4.2 Geheimhaltung und Steuergeheimnis
- § 30 AO bleibt in der Verantwortung des Steuerberaters
- Technische Absicherung durch RLS-Policies, Verschlüsselung, getrennte Datenräume je Mandant
- **Was klären?**
  - [ ] Möchte WSB separates Penetration-Testing oder ein SOC-2-Audit beauftragen, bevor Pilot-Belege übertragen werden?
  - [ ] Hat WSB einen externen IT-Sicherheitsbeauftragten, der vor Freigabe prüfen muss?

### 4.3 Pilot-Konditionen
- Während Pilot-Phase: kostenfrei für WSB und die ersten Mandanten
- Dauer: 3 Monate
- Nach Pilot: WSB entscheidet über Vertragsverlängerung
- **Was klären?**
  - [ ] Vertraglich fixieren oder per Letter of Intent?
  - [ ] Verlängerungsoption automatisch oder mit Kündigungsfrist?

---

## 5. Erfolgsmessung

Welche Metriken definieren wir für ein „erfolgreiches Pilot"?

Vorschlag:
- ≥ 80 % der erfassten Belege werden ohne manuelle Korrektur in DATEV importiert
- ≥ 50 % Zeitersparnis bei der Beleg-Vorerfassung in der Kanzlei
- Mandant-Zufriedenheit ≥ 8/10
- WSB-Mitarbeiter-Akzeptanz ≥ 7/10
- 0 datenschutzrelevante Vorfälle

**Was klären?**
- [ ] Stimmt Tim diesen Metriken zu? Welche fehlen aus seiner Sicht?

---

## Vorgehen

1. **Phase 1** (jetzt): WhatsApp-Erstkontakt → Coffee/Call vereinbaren — Vorlage `docs/TIM_WHATSAPP_INTRO.md`
2. **Phase 2** (Coffee/Call): Tim die App zeigen — TestFlight-Build sobald approved, sonst Web-Demo
3. **Phase 3** (nach positiver Reaktion): Diesen Briefing-Schwerpunkt durchgehen, AVV zur Gegenzeichnung vorlegen, Pilot-Mandanten identifizieren
4. **Phase 4** (Pilot-Onboarding): Mandanten-Stammdaten, erstes Monatsende, Feedback-Loop etabliert
