-- ─────────────────────────────────────────────────────────────────────────
--   advisor_setup_tokens — Magic-Link-Tokens für Steuerberater-Onboarding
-- ─────────────────────────────────────────────────────────────────────────
--
--   Use Case:
--   Ein BelegManager-User (Mandant) lädt seinen Steuerberater per Magic-Link
--   ein, die DATEV-Stammdaten einer Company (Berater-Nr, Mandanten-Nr,
--   Kontenrahmen, Gegenkonto, WJ-Beginn) zu setzen. Der Steuerberater
--   bekommt eine Mail mit einem signierten Link, klickt drauf, sieht eine
--   Public-Route ohne Login, trägt die Werte ein, fertig.
--
--   Sicherheits-Pattern:
--   - Token-WERT wird NIE in der DB gespeichert, nur sein SHA-256-Hash.
--     Der echte Token existiert nur in der versendeten E-Mail.
--   - Single-Use: nach consumed_at != NULL ist der Token unbrauchbar.
--   - Time-Limited: expires_at default 7 Tage nach Erstellung.
--   - Audit: IP-Adresse und User-Agent des Consumers werden geloggt, damit
--     bei Verdacht ein Forensik-Trail existiert.
--   - RLS: Owner (der einladende User) kann eigene Tokens lesen und vor
--     Consume revoken. INSERT/UPDATE nur via Edge Function (service_role).
--
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Welche Company soll der Steuerberater konfigurieren?
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Wer hat die Einladung versendet (= Owner der Company)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- SHA-256-Hash des Tokens (Hex). Der Klartext-Token existiert nur in der Mail.
  token_hash text NOT NULL UNIQUE,
  -- E-Mail-Adresse des Steuerberaters (für Audit + Anzeige im Form)
  advisor_email text NOT NULL,
  -- Optional: Notiz an den Steuerberater ("Bitte für meine GmbH konfigurieren")
  invitation_note text,
  -- Ablaufzeitpunkt — Default 7 Tage in der Zukunft
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  -- NULL bis verbraucht, dann Timestamp des Setups
  consumed_at timestamptz,
  -- Audit: IP und User-Agent des Consumers (Steuerberater)
  consumed_ip text,
  consumed_user_agent text,
  -- Wann wurde der Token erstellt
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indizes für Lookup-Performance
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_token_hash_idx
  ON public.advisor_setup_tokens(token_hash);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_user_id_idx
  ON public.advisor_setup_tokens(user_id);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_company_id_idx
  ON public.advisor_setup_tokens(company_id);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_expires_at_idx
  ON public.advisor_setup_tokens(expires_at)
  WHERE consumed_at IS NULL;

-- RLS aktivieren
ALTER TABLE public.advisor_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Owner kann eigene Tokens sehen (Status: pending / consumed / expired)
DROP POLICY IF EXISTS "Users can view own advisor_setup_tokens" ON public.advisor_setup_tokens;
CREATE POLICY "Users can view own advisor_setup_tokens"
  ON public.advisor_setup_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Owner kann pending Tokens revoke (z. B. wenn er Steuerberater wechselt)
DROP POLICY IF EXISTS "Users can revoke own pending advisor_setup_tokens" ON public.advisor_setup_tokens;
CREATE POLICY "Users can revoke own pending advisor_setup_tokens"
  ON public.advisor_setup_tokens
  FOR DELETE
  USING (user_id = auth.uid() AND consumed_at IS NULL);

-- KEINE Policy für INSERT / UPDATE vom Client — passiert ausschließlich
-- über Edge Functions mit service_role (umgehen RLS).

-- Table-GRANTs für PostgREST (Supabase-Pattern):
--   - authenticated kann via Client-SDK lesen + revoke (RLS filtert),
--     INSERT/UPDATE bleibt blockiert weil keine entsprechende Policy
--   - service_role hat vollen Zugriff für Edge Functions
GRANT SELECT, DELETE ON public.advisor_setup_tokens TO authenticated;
GRANT ALL ON public.advisor_setup_tokens TO service_role;

-- Schema-Cache reload für PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.advisor_setup_tokens IS
  'Magic-Link-Tokens für Steuerberater-Onboarding. Token-Hash gespeichert, niemals Klartext.';
COMMENT ON COLUMN public.advisor_setup_tokens.token_hash IS
  'SHA-256-Hash des Klartext-Tokens (hex). Klartext existiert nur in versendeter Mail.';
COMMENT ON COLUMN public.advisor_setup_tokens.consumed_at IS
  'NULL = pending, Timestamp = verbraucht (single-use Garantie).';
