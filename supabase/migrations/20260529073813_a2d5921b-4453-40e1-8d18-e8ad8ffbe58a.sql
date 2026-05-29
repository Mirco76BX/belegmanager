
-- 1. Profiles UPDATE: freeze privileged columns at policy level (defense-in-depth alongside trigger)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_tax_advisor IS NOT DISTINCT FROM (SELECT p.is_tax_advisor FROM public.profiles p WHERE p.id = auth.uid())
  AND is_blocked IS NOT DISTINCT FROM (SELECT p.is_blocked FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Receipts DELETE: block deletion of festgeschriebene receipts at policy level
DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;
CREATE POLICY "Users can delete own receipts"
ON public.receipts
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND accounting_status NOT IN ('exported', 'verbucht'));

-- 3. Receipts UPDATE: block updates of festgeschriebene receipts at policy level
DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
CREATE POLICY "Users can update own receipts"
ON public.receipts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND accounting_status NOT IN ('exported', 'verbucht'))
WITH CHECK (user_id = auth.uid() AND accounting_status NOT IN ('exported', 'verbucht'));

-- 4. Drop duplicate storage INSERT policy
DROP POLICY IF EXISTS "Users can upload receipt files" ON storage.objects;

-- 5. Revoke EXECUTE on SECURITY DEFINER functions from anon/PUBLIC; grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_tax_advisor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_as_tax_advisor(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_advisor_link(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tax_advisor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_as_tax_advisor(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_advisor_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) TO authenticated;

-- 6. scan_rate_log: add explicit policies (currently RLS enabled with no policy = silent deny but linter warns)
CREATE POLICY "Users can view own scan rate log"
ON public.scan_rate_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own scan rate log"
ON public.scan_rate_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
