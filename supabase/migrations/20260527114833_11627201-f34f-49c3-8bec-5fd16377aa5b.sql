
-- =========================================================
-- ISSUE 5 + 12: Coupon codes exposure
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
-- Admin-manage policy stays in place; redeem-coupon edge fn uses service_role.

-- Lookup RPC: validate a single coupon by code (no enumeration).
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE(tier text, duration_days integer, valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.tier,
         c.duration_days,
         (c.is_active AND (c.max_uses IS NULL OR c.used_count < c.max_uses)) AS valid
  FROM public.coupons c
  WHERE lower(c.code) = lower(_code)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated, service_role;

-- =========================================================
-- ISSUE 7: Advisors need to read client companies
-- =========================================================
DROP POLICY IF EXISTS "Advisors can view client companies" ON public.companies;
CREATE POLICY "Advisors can view client companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    public.is_tax_advisor(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid() AND ac.client_id = companies.user_id
    )
  )
);
-- Drop the now-redundant owner-only SELECT policy (covered by the new one).
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;

-- =========================================================
-- ISSUE 3: Tighten EXECUTE on SECURITY DEFINER functions
-- =========================================================
-- Trigger functions: nobody should call directly.
REVOKE ALL ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_receipt_export()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_exported_receipts()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_exported_receipts_delete() FROM PUBLIC, anon, authenticated;

-- RLS helpers: must remain callable by authenticated (used inside policies);
-- revoke from anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_tax_advisor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tax_advisor(uuid) TO authenticated, service_role;

-- User-callable RPCs: authenticated only.
REVOKE ALL ON FUNCTION public.update_receipt_accounting_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.register_as_tax_advisor(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_as_tax_advisor(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.accept_advisor_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_advisor_link(uuid) TO authenticated, service_role;

-- =========================================================
-- ISSUE 1 (defense-in-depth): whitelist accounting_status in RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_receipt_accounting_status(_receipt_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _receipt_user_id uuid;
BEGIN
  IF _status NOT IN ('open','ready','exported','verbucht') THEN
    RAISE EXCEPTION 'Invalid accounting status: %', _status;
  END IF;

  SELECT user_id INTO _receipt_user_id FROM public.receipts WHERE id = _receipt_id;
  IF _receipt_user_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  IF _receipt_user_id = auth.uid() OR (
    public.is_tax_advisor(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.advisor_clients
      WHERE advisor_id = auth.uid() AND client_id = _receipt_user_id
    )
  ) THEN
    UPDATE public.receipts SET accounting_status = _status, updated_at = now() WHERE id = _receipt_id;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.update_receipt_accounting_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) TO authenticated, service_role;
