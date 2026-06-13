
-- 1) receipt_changes: INSERT only for own receipts (GoBD audit integrity)
DROP POLICY IF EXISTS "Users can insert own receipt changes" ON public.receipt_changes;
CREATE POLICY "Users can insert own receipt changes"
ON public.receipt_changes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND changed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_changes.receipt_id
      AND r.user_id = auth.uid()
  )
);

-- 2) advisor_invitations: INSERT only if caller is a real tax advisor
DROP POLICY IF EXISTS "Advisors can insert invitations" ON public.advisor_invitations;
CREATE POLICY "Advisors can insert invitations"
ON public.advisor_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  advisor_id = auth.uid()
  AND public.is_tax_advisor(auth.uid())
);

-- 3) scan_rate_log: lock down to service_role only (edge function uses service role)
DROP POLICY IF EXISTS "Service role manages scan rate log" ON public.scan_rate_log;
CREATE POLICY "Service role manages scan rate log"
ON public.scan_rate_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.scan_rate_log FROM anon, authenticated;
GRANT ALL ON public.scan_rate_log TO service_role;
