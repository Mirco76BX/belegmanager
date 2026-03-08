
-- Drop the old authenticated-only insert policy
DROP POLICY IF EXISTS "Authenticated users can submit contact requests" ON public.contact_requests;

-- Allow anyone (including anonymous/unauthenticated) to insert contact requests
CREATE POLICY "Anyone can submit contact requests"
ON public.contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
