-- ─────────────────────────────────────────────────────────────────────────
--   Multi-Mandant: DATEV-Stammdaten pro `companies`-Eintrag
-- ─────────────────────────────────────────────────────────────────────────
--
--   Hintergrund:
--   Bisher waren Berater-Nr, Mandanten-Nr, Kontenrahmen, Gegenkonto etc.
--   global im LocalStorage des Geräts gespeichert. Wenn ein User mehrere
--   Legal Entities (companies) hat, kann er nicht pro Mandant einen
--   eigenen DATEV-Stapel exportieren.
--
--   Feedback Steuerberater (Mai 2026):
--   - Jede Legal Entity braucht ihren eigenen Buchungsstapel
--   - Pro Mandant eigene Berater-/Mandanten-Nr
--   - Gegenkonto ist ein VERBINDLICHKEITSKONTO (3300 SKR04 / 1600 SKR03),
--     KEIN Bank-Konto — sonst doppelt mit Kontoauszug-Import.
--
-- ─────────────────────────────────────────────────────────────────────────

-- DATEV-Stammdaten pro Company. Alle nullable, damit bestehende
-- companies-Einträge keinen Migration-Fehler bekommen.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS datev_berater_nr text,
  ADD COLUMN IF NOT EXISTS datev_mandanten_nr text,
  ADD COLUMN IF NOT EXISTS datev_kontenrahmen text
    CHECK (datev_kontenrahmen IN ('SKR03', 'SKR04')),
  ADD COLUMN IF NOT EXISTS datev_konto_gegenkonto text,
  ADD COLUMN IF NOT EXISTS datev_wj_beginn date,
  ADD COLUMN IF NOT EXISTS datev_sachkontenlaenge integer
    CHECK (datev_sachkontenlaenge IN (4, 5, 6, 7, 8)),
  ADD COLUMN IF NOT EXISTS datev_bezeichnung text,
  ADD COLUMN IF NOT EXISTS datev_diktatkuerzel text;

-- Index für Lookups bei Export (selten, aber nice-to-have)
CREATE INDEX IF NOT EXISTS companies_user_id_idx ON public.companies(user_id);

COMMENT ON COLUMN public.companies.datev_berater_nr IS
  'DATEV-Beraternummer (7-stellig, vom Steuerberater pro Mandant)';
COMMENT ON COLUMN public.companies.datev_mandanten_nr IS
  'DATEV-Mandantennummer (5-stellig, von Steuerberater pro Mandant)';
COMMENT ON COLUMN public.companies.datev_kontenrahmen IS
  'Kontenrahmen — SKR03 oder SKR04, je nach Steuerberater-Setup';
COMMENT ON COLUMN public.companies.datev_konto_gegenkonto IS
  'Gegenkonto = Verrechnungs-/Verbindlichkeitskonto. NICHT Bank, sonst doppelte Buchung bei Kontoauszug-Import. Standard: SKR04=3300, SKR03=1600.';
COMMENT ON COLUMN public.companies.datev_wj_beginn IS
  'Wirtschaftsjahr-Beginn (Datum) für DATEV-Vorlauf';

-- Steuerberater-Email pro User (für späteren App-internen Mail-Versand)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_advisor_email text,
  ADD COLUMN IF NOT EXISTS tax_advisor_name text;

COMMENT ON COLUMN public.profiles.tax_advisor_email IS
  'E-Mail-Adresse des Steuerberaters für direkten Versand aus der App';

-- Schema-Cache reload
NOTIFY pgrst, 'reload schema';
