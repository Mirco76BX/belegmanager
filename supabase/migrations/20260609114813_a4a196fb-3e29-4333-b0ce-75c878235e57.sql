
-- Lock down scan_rate_log to service_role only
DROP POLICY IF EXISTS "Users can insert own scan rate log" ON public.scan_rate_log;
DROP POLICY IF EXISTS "Users can view own scan rate log" ON public.scan_rate_log;

-- Tighten advisor_invitations client UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Clients can respond to invitations" ON public.advisor_invitations;

CREATE POLICY "Clients can respond to invitations"
ON public.advisor_invitations
FOR UPDATE
USING (
  (client_id = auth.uid())
  OR (client_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
)
WITH CHECK (
  -- After update, the row must still belong to this client and be a valid accept/decline
  status IN ('accepted', 'declined')
  AND client_id = auth.uid()
  AND advisor_id = (SELECT advisor_id FROM public.advisor_invitations WHERE id = advisor_invitations.id)
);
