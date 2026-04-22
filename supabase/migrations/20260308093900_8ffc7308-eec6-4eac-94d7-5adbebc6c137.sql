CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text NOT NULL,
  email text NOT NULL,
  phone text,
  org_type text NOT NULL DEFAULT 'company',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert
CREATE POLICY "Authenticated users can submit contact requests"
  ON public.contact_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view contact requests"
  ON public.contact_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));