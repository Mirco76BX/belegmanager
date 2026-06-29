-- =====================================================================
-- PART A: receipts UPDATE policy already hardened in previous migration
-- (policy name in DB: "Users can update own receipts" — already contains
--  datev_exported_at IS NULL in USING + WITH CHECK). No-op here.
-- =====================================================================

-- =====================================================================
-- PART B: alias trigger name as requested (defense in depth)
-- Function already exists as prevent_datev_exported_at_unset; add the
-- user-requested function name + trigger name as additional safety net.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prevent_datev_exported_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.datev_exported_at IS NOT NULL AND NEW.datev_exported_at IS NULL THEN
    RAISE EXCEPTION 'GoBD-Verletzung: datev_exported_at darf nicht zurückgesetzt werden';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS receipts_prevent_datev_reset ON public.receipts;
CREATE TRIGGER receipts_prevent_datev_reset
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_datev_exported_reset();

-- =====================================================================
-- PART C: advisor_setup_tokens — hide consumed_ip / consumed_user_agent
-- =====================================================================

-- 1. Safe view (SECURITY DEFINER default; filters by auth.uid())
CREATE OR REPLACE VIEW public.advisor_setup_tokens_safe AS
  SELECT
    id,
    company_id,
    user_id,
    advisor_email,
    invitation_note,
    expires_at,
    consumed_at,
    created_at
  FROM public.advisor_setup_tokens
  WHERE user_id = auth.uid();

-- 2. Grant view access to authenticated users
GRANT SELECT ON public.advisor_setup_tokens_safe TO authenticated;

-- 3. Remove direct user SELECT on raw table (DSGVO: hide audit columns)
DROP POLICY IF EXISTS "Users can view own advisor_setup_tokens"
  ON public.advisor_setup_tokens;

-- DELETE policy ("Users can revoke own pending advisor_setup_tokens")
-- stays untouched so users can still revoke their own pending tokens.
-- Service-role (Edge Functions: request-advisor-setup, consume-...)
-- bypasses RLS and continues to have full access to all columns.