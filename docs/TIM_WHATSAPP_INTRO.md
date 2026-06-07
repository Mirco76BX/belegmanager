# Tim Färber — WhatsApp-Erstkontakt

**Setting**: persönlich befreundet · WSB GmbH (WP+StB) in Wentorf bei Hamburg · DATEV-Kanzlei · echter Multiplikator-Kandidat

**Ziel der ersten Nachricht**: Coffee/Call vereinbaren, NICHT pitchen. AVV, Briefing, Pricing kommen später.

---

## Variante A — Tim weiß bereits vom Projekt (FINAL)

```
Moin Tim,

der BelegManager ist soweit — Apple prüft gerade den ersten externen Beta-Build inkl. DATEV-Export (EXTF Format 7, Festschreibung konfigurierbar, Gegenkonto 3300/1600 Default). Ab nächster Woche kann ich TestFlight-Zugänge raushauen.

Hättest du Lust, dir das aus WP-Sicht mal anzuschauen? Ich würd gern mit dir durchdenken, ob wir bei WSB einen Pilot fahren — 3-5 Mandanten, 3 Monate kostenfrei. Bevor wir das wirklich angehen: kurzer Coffee/Call, 30 Min, du sagst mir was du davon hältst und was aus deiner Sicht noch fehlt.

Wann passt dir's nächste Woche?

Grüße
Mirco
```

---

## Variante B — Tim hat noch nichts mit BelegManager am Hut

```
Moin Tim,

hab in den letzten Monaten eine App gebaut: BelegManager. Belege fotografieren → OCR → DATEV-Export. Zielgruppe: Mandanten von Steuerberatern, die ihre Belege mobil erfassen wollen, statt sie monatlich in Tüten abzugeben.

Apple prüft gerade den ersten externen Beta-Build. Wenn das ab nächster Woche live geht, hätte ich Lust dich mal drauf schauen zu lassen — als jemand, der die Steuerberater-Seite kennt.

30 Minuten Kaffee/Call ne Idee? Würd mich interessieren, was du davon hältst.

Grüße
Mirco
```

---

## Variante C — Super kurz, klassisches „Hörmal"

```
Moin Tim, hab da was gebaut, was dich interessieren könnte — BelegManager, Belegerfassungs-App mit DATEV-Export. Lust auf Kaffee/Call die Tage? 30 Min reicht. Gruß Mirco
```

---

## Strategie-Notiz

**Nicht im ersten Kontakt erwähnen**:
- AVV, DSGVO, § 30 AO — kommt im Briefing
- Pricing-Modelle, White-Label, Multiplikator
- Pilot-Konditionen im Detail
- TestFlight-Link (kommt erst nach Apple-Approval)

**Wenn Tim positiv antwortet**:
1. Termin fixieren (in seinem Büro, oder Call)
2. Vorab: TIM_BRIEFING.md noch nicht schicken — er soll erst die App sehen, dann kommen die Fragen organisch
3. **Im Termin selbst**: TIM_BRIEFING.md ist dein interner Spickzettel — geh die fünf Themenblöcke durch (DATEV-Klärungen, White-Label, Pilot-Setup, Vertragsstruktur, Erfolgsmetriken)
4. **Nach dem Termin**: AVV (`docs/AVV.md`) als PDF mailen, mit Bitte um Gegenzeichnung

**Falls Tim skeptisch oder lange Pause**:
- Nicht nachhaken. „Kein Stress, ist eh in Beta — schreibst dich, wenn dir was einfällt."
- Stattdessen einen anderen Steuerberater-Kontakt aktivieren

**Was Tim als WP voraussichtlich fragen wird** (gut vorbereiten):
1. „Wo liegen die Daten?" → Supabase Frankfurt, EU-SCC, RLS
2. „Sind die festgeschriebenen Belege GoBD-konform?" → ja, Tabelle `receipt_changes` + Trigger
3. „Wer haftet bei Datenverlust?" → AGB § X (Beta-Haftungsausschluss, später Standard-Haftungsbegrenzung)
4. „Wie sieht der DATEV-Export aus?" → EXTF Format Nr. 7, Festschreibung=0, Konto-Mapping konfigurierbar
5. „Was kostet das für meine Mandanten?" → BASIC 1,99/Mo, PRO 9,99/Mo, BUSINESS 19,99/Mo + Add-on User, Pilot kostenfrei
