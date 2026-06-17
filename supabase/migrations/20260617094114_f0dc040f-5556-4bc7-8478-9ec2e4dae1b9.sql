-- Remove the security-definer view from the previous migration
DROP VIEW IF EXISTS public.advisor_setup_tokens_safe;

-- Column-level security: revoke broad SELECT, grant only safe columns
REVOKE SELECT ON public.advisor_setup_tokens FROM authenticated;
GRANT SELECT
  (id, company_id, user_id, advisor_email, invitation_note,
   expires_at, consumed_at, created_at)
  ON public.advisor_setup_tokens TO authenticated;

-- Re-add owner SELECT policy (was dropped in prior migration)
DROP POLICY IF EXISTS "Users can view own advisor_setup_tokens"
  ON public.advisor_setup_tokens;
CREATE POLICY "Users can view own advisor_setup_tokens"
  ON public.advisor_setup_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role keeps full access (no change)