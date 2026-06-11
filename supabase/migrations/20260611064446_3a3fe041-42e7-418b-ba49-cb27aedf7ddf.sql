CREATE TABLE IF NOT EXISTS public.advisor_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  advisor_email text NOT NULL,
  invitation_note text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at timestamptz,
  consumed_ip text,
  consumed_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_setup_tokens_token_hash_idx
  ON public.advisor_setup_tokens(token_hash);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_user_id_idx
  ON public.advisor_setup_tokens(user_id);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_company_id_idx
  ON public.advisor_setup_tokens(company_id);
CREATE INDEX IF NOT EXISTS advisor_setup_tokens_expires_at_idx
  ON public.advisor_setup_tokens(expires_at)
  WHERE consumed_at IS NULL;

GRANT SELECT, DELETE ON public.advisor_setup_tokens TO authenticated;
GRANT ALL ON public.advisor_setup_tokens TO service_role;

ALTER TABLE public.advisor_setup_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own advisor_setup_tokens" ON public.advisor_setup_tokens;
CREATE POLICY "Users can view own advisor_setup_tokens"
  ON public.advisor_setup_tokens
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can revoke own pending advisor_setup_tokens" ON public.advisor_setup_tokens;
CREATE POLICY "Users can revoke own pending advisor_setup_tokens"
  ON public.advisor_setup_tokens
  FOR DELETE
  USING (user_id = auth.uid() AND consumed_at IS NULL);

NOTIFY pgrst, 'reload schema';