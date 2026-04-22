
-- Create a security definer function to check if a user is a tax advisor
CREATE OR REPLACE FUNCTION public.is_tax_advisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_tax_advisor = true
  )
$$;

-- Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Advisors can view client profiles" ON public.profiles;

-- Recreate without self-referencing join
CREATE POLICY "Advisors can view client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR (
    is_tax_advisor(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid() AND ac.client_id = profiles.id
    )
  )
);

-- Fix the same pattern on receipts
DROP POLICY IF EXISTS "Advisors can view client receipts" ON public.receipts;

CREATE POLICY "Advisors can view client receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    is_tax_advisor(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid() AND ac.client_id = receipts.user_id
    )
  )
);
