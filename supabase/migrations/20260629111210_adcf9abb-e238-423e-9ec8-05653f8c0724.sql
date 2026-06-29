
-- 1. Table
CREATE TABLE public.business_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  organization text,
  email text,
  notes text,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contacts TO authenticated;
GRANT ALL ON public.business_contacts TO service_role;

-- 3. RLS
ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contacts"
  ON public.business_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Indexes
CREATE INDEX idx_business_contacts_user ON public.business_contacts(user_id);
CREATE INDEX idx_business_contacts_lastused
  ON public.business_contacts(user_id, last_used_at DESC NULLS LAST);
CREATE UNIQUE INDEX idx_business_contacts_unique
  ON public.business_contacts(user_id, lower(full_name), lower(coalesce(organization, '')));

-- 5. updated_at trigger (reuse existing helper if present, else create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_business_contacts_updated_at
  BEFORE UPDATE ON public.business_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Receipts extension
ALTER TABLE public.receipts
  ADD COLUMN contact_id uuid REFERENCES public.business_contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_receipts_contact ON public.receipts(contact_id);

-- 7. Data migration: build contacts from existing receipts
INSERT INTO public.business_contacts (user_id, full_name, organization, last_used_at, use_count)
SELECT
  r.user_id,
  -- preserve first-seen capitalization
  (array_agg(r.person_met ORDER BY r.created_at DESC))[1] AS full_name,
  (array_agg(r.organization ORDER BY r.created_at DESC))[1] AS organization,
  MAX(r.created_at) AS last_used_at,
  COUNT(*)::int AS use_count
FROM public.receipts r
WHERE r.person_met IS NOT NULL AND length(trim(r.person_met)) > 0
GROUP BY r.user_id, lower(trim(r.person_met)), lower(coalesce(trim(r.organization), ''))
ON CONFLICT (user_id, lower(full_name), lower(coalesce(organization, ''))) DO NOTHING;

-- 8. Link existing receipts to contacts
UPDATE public.receipts r
SET contact_id = bc.id
FROM public.business_contacts bc
WHERE r.contact_id IS NULL
  AND r.user_id = bc.user_id
  AND r.person_met IS NOT NULL
  AND lower(trim(r.person_met)) = lower(bc.full_name)
  AND lower(coalesce(trim(r.organization), '')) = lower(coalesce(bc.organization, ''));

-- 9. Upsert RPC
CREATE OR REPLACE FUNCTION public.upsert_business_contact(
  _full_name text,
  _organization text DEFAULT NULL,
  _email text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name required';
  END IF;

  INSERT INTO public.business_contacts (user_id, full_name, organization, email, notes, last_used_at, use_count)
  VALUES (_user_id, trim(_full_name), NULLIF(trim(_organization), ''), NULLIF(trim(_email), ''), NULLIF(trim(_notes), ''), now(), 1)
  ON CONFLICT (user_id, lower(full_name), lower(coalesce(organization, '')))
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.business_contacts.email),
    notes = COALESCE(EXCLUDED.notes, public.business_contacts.notes),
    last_used_at = now(),
    use_count = public.business_contacts.use_count + 1,
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_business_contact(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_business_contact(text, text, text, text) TO authenticated;
