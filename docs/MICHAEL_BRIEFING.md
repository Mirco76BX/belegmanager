# Michael-Briefing — Pilot-Klärungen mit do.tax

**Stand: Juni 2026**

Liste der offenen Punkte, die mit Michael Mönnekes (do.tax) vor Pilot-Start geklärt werden müssen. Bei jedem Punkt steht die Empfehlung des Entwicklungs-Teams; Michael's Antwort sollte als Bestätigung oder Korrektur dokumentiert werden.

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

### 1.2 Gegenkonto-Wahl
- **Stand**: Default ist **3300 (Verbindlichkeiten aus L+L) für SKR04** und **1600 für SKR03**
- **Warum nicht 1800/1200 (Bank)?** Bank wird vom Steuerberater regelmäßig automatisiert aus Kontoauszügen importiert. Würde der BelegManager Bank als Gegenkonto setzen, würde der Aufwand bei jeder Buchung doppelt erscheinen.
- **Was klären?**
  - [ ] Bestätigt Michael die Default-Wahl 3300 / 1600?
  - [ ] Gibt es Mandantenkonstellationen, in denen ein anderes Gegenkonto sinnvoller ist (z. B. Bargeld-Kassen)?

### 1.3 Bewirtungsbeleg-Aufteilung
- **Stand**: 70/30-Split: 70 % auf Bewirtungs-Aufwand (6640 SKR04 / 4650 SKR03), 30 % als nicht abziehbar (z. B. 6644 SKR04)
- **MwSt**: 100 % Vorsteuer (§ 15 Abs. 1 Nr. 1 UStG i. V. m. § 4 Abs. 5 Nr. 2 EStG)
- **Was klären?**
  - [ ] Verfährt do.tax bei Bewirtungsbelegen mit der gleichen 70/30-Aufteilung, oder werden 100 % gebucht und die 30 % nur außerbilanziell hinzugerechnet?
  - [ ] Welche Konten verwendet do.tax konkret für den nicht abziehbaren 30 %-Anteil?

### 1.4 Multi-MwSt-Belege (z. B. Lebensmittel 7 % + Getränke 19 %)
- **Stand**: BelegManager teilt automatisch in mehrere Buchungszeilen mit korrektem MwSt-Schlüssel
- **Was klären?**
  - [ ] Akzeptiert do.tax mehrere Buchungszeilen pro Beleg im DATEV-Stapel, oder soll je eine Zeile pro Steuerschlüssel als separate Buchung dargestellt werden?

### 1.5 Trinkgeld
- **Stand**: Neue Funktion — wenn Brutto > Summe(MwSt-Items), Differenz kann als „Trinkgeld" mit 0 % MwSt erfasst werden
- **Buchung**: Bei Bewirtung als Teil der Bewirtungskosten (70/30-Split anwendbar?)
- **Was klären?**
  - [ ] Bestätigt Michael die steuerliche Behandlung als anerkannte Betriebsausgabe?
  - [ ] Soll Trinkgeld auf ein separates Konto laufen (z. B. 6643 „Trinkgelder")?

## 2. White-Label-Modell für do.tax

### 2.1 Branding
- **Idee**: BelegManager als App, die do.tax seinen Mandanten zur Verfügung stellt — mit do.tax-Logo, Farben und Kontaktangaben
- **Was klären?**
  - [ ] Interesse vorhanden? Wenn ja: zu welchem Preis (pauschal pro Monat? pro Mandant?)
  - [ ] Welche Anpassungen am UI/UX wären für do.tax wichtig?
  - [ ] App-Verteilung: über separaten Apple-Account von do.tax oder als „White-Label-Konfiguration" innerhalb der BelegManager-App?

### 2.2 Lizenzmodell-Vorschlag (zur Diskussion)
- **Variante A**: 39 €/Monat Berater + 1 €/Monat pro aktivem Mandant
- **Variante B**: 99 €/Monat Pauschale bis 25 Mandanten, +49 €/Monat je weitere 25
- **Variante C**: Lizenz-Sharing: do.tax kassiert vom Mandant, Anno 76 erhält 50 %

## 3. Pilot-Setup

### 3.1 Erste Pilot-Mandanten
- **Frage**: Welche 3–5 Mandanten würde do.tax als Erstes onboarden?
- **Profil**: Idealerweise Mischung aus Bäckerei, Selbstständigen und kleinen Handwerksbetrieben — alle mit regelmäßigen, klar abgrenzbaren Belegströmen.
- **Was klären?**
  - [ ] Hat Michael konkrete Mandantenvorschläge?
  - [ ] Welche Tarif-Tier soll Pilot-Mandanten zugewiesen werden?

### 3.2 Onboarding-Begleitung
- Beleg-Erfassung üben (Foto-Aufnahmen, OCR-Korrektur, Festschreibung)
- DATEV-Stammdaten je Mandant konfigurieren (Berater-Nr. 6190, Mandanten-Nr. individuell)
- Erstes Monatsende-DATEV-Stapel-Export gemeinsam durchgehen
- **Was klären?**
  - [ ] Wer übernimmt die Mandanten-Schulung — Michael, Anno 76, oder gemeinsam?
  - [ ] Wer ist Eskalations-Ansprechpartner bei Bugs?

## 4. Vertragsstruktur

### 4.1 AVV mit do.tax
- Steuerberater = Verantwortlicher, Anno 76 = Auftragsverarbeiter
- AVV-Entwurf liegt in `docs/AVV.md`
- **Was klären?**
  - [ ] Hat do.tax bereits AVV-Standardklauseln, die übernommen werden sollen?

### 4.2 Geheimhaltung und Steuergeheimnis
- § 30 AO bleibt in der Verantwortung des Steuerberaters
- Technische Absicherung durch RLS-Policies, Verschlüsselung, getrennte Datenräume je Mandant
- **Was klären?**
  - [ ] Möchte do.tax separates Penetration-Testing oder ein SOC-2-Audit beauftragen, bevor Pilot-Belege übertragen werden?

### 4.3 Pilot-Konditionen
- Während Pilot-Phase: kostenfrei für do.tax und die ersten Mandanten
- Dauer: 3 Monate
- Nach Pilot: do.tax entscheidet über Vertragsverlängerung
- **Was klären?**
  - [ ] Vertraglich fixieren oder per Letter of Intent?

## 5. Erfolgsmessung

Welche Metriken definieren wir für ein „erfolgreiches Pilot"?

Vorschlag:
- ≥ 80 % der erfassten Belege werden ohne manuelle Korrektur in DATEV importiert
- ≥ 50 % Zeitersparnis bei der Beleg-Vorerfassung in der Kanzlei
- Mandant-Zufriedenheit ≥ 8/10
- 0 datenschutzrelevante Vorfälle

**Was klären?**
- [ ] Stimmt Michael diesen Metriken zu? Welche fehlen aus seiner Sicht?

---

## Vorgehen

1. Termin mit Michael vereinbaren (vor Externe-Tester-Onboarding)
2. Diese Liste als Diskussions-Agenda nutzen
3. Antworten direkt im Dokument festhalten (per Pull-Request)
4. Bei kritischen Klärungspunkten: schriftliche Bestätigung per E-Mail
