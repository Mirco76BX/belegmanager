-- Table for advisor invitations (pending approval by client)
CREATE TABLE public.advisor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  client_email text NOT NULL,
  client_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE public.advisor_invitations ENABLE ROW LEVEL SECURITY;

-- Advisors can see their own invitations
CREATE POLICY "Advisors can view own invitations"
  ON public.advisor_invitations FOR SELECT
  USING (advisor_id = auth.uid());

-- Advisors can create invitations
CREATE POLICY "Advisors can insert invitations"
  ON public.advisor_invitations FOR INSERT
  WITH CHECK (advisor_id = auth.uid());

-- Advisors can delete own pending invitations
CREATE POLICY "Advisors can delete own invitations"
  ON public.advisor_invitations FOR DELETE
  USING (advisor_id = auth.uid() AND status = 'pending');

-- Clients can see invitations addressed to them (by email or client_id)
CREATE POLICY "Clients can view invitations to them"
  ON public.advisor_invitations FOR SELECT
  USING (
    client_id = auth.uid()
    OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Clients can update (accept/decline) invitations addressed to them
CREATE POLICY "Clients can respond to invitations"
  ON public.advisor_invitations FOR UPDATE
  USING (
    client_id = auth.uid()
    OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Also allow clients to delete advisor_clients entries (revoke access)
CREATE POLICY "Clients can revoke advisor access"
  ON public.advisor_clients FOR DELETE
  USING (client_id = auth.uid());