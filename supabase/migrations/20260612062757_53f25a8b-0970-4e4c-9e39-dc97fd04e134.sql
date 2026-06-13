-- Allow clients to read their own advisor relationship rows (consistency with existing DELETE policy)
DROP POLICY IF EXISTS "Clients can view own advisor links" ON public.advisor_clients;
CREATE POLICY "Clients can view own advisor links"
  ON public.advisor_clients
  FOR SELECT
  USING (client_id = auth.uid());

-- Allow tax advisors to read receipt change history for their linked clients
DROP POLICY IF EXISTS "Advisors can view client receipt changes" ON public.receipt_changes;
CREATE POLICY "Advisors can view client receipt changes"
  ON public.receipt_changes
  FOR SELECT
  USING (
    public.is_tax_advisor(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
        AND ac.client_id = receipt_changes.user_id
    )
  );

NOTIFY pgrst, 'reload schema';