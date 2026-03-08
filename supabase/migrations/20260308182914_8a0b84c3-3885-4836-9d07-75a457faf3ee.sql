-- Table to link tax advisors to their clients
CREATE TABLE public.advisor_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advisor_id, client_id)
);

ALTER TABLE public.advisor_clients ENABLE ROW LEVEL SECURITY;

-- Advisors can see their own client links
CREATE POLICY "Advisors can view own clients"
ON public.advisor_clients FOR SELECT
TO authenticated
USING (advisor_id = auth.uid());

-- Advisors can add clients
CREATE POLICY "Advisors can insert clients"
ON public.advisor_clients FOR INSERT
TO authenticated
WITH CHECK (advisor_id = auth.uid());

-- Advisors can remove clients
CREATE POLICY "Advisors can delete own clients"
ON public.advisor_clients FOR DELETE
TO authenticated
USING (advisor_id = auth.uid());

-- Allow tax advisors to view receipts of their clients
CREATE POLICY "Advisors can view client receipts"
ON public.receipts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.advisor_clients ac
    JOIN public.profiles p ON p.id = ac.advisor_id
    WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = receipts.user_id
      AND p.is_tax_advisor = true
  )
);

-- Allow tax advisors to view profiles of their clients
CREATE POLICY "Advisors can view client profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.advisor_clients ac
    JOIN public.profiles adv ON adv.id = ac.advisor_id
    WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = profiles.id
      AND adv.is_tax_advisor = true
  )
);