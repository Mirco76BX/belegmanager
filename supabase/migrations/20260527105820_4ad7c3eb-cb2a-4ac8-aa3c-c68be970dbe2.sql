
-- 1. Audit-Log Tabelle
CREATE TABLE public.tax_advisor_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kanzlei text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  notes text
);

GRANT SELECT ON public.tax_advisor_registrations TO authenticated;
GRANT ALL ON public.tax_advisor_registrations TO service_role;

ALTER TABLE public.tax_advisor_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own registrations"
  ON public.tax_advisor_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all registrations"
  ON public.tax_advisor_registrations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update registrations"
  ON public.tax_advisor_registrations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- Kein INSERT-Policy: Einträge entstehen nur über SECURITY DEFINER RPC.

-- 2. Registrierungs-RPC
CREATE OR REPLACE FUNCTION public.register_as_tax_advisor(_kanzlei text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _already boolean;
  _reg_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _kanzlei IS NULL OR length(trim(_kanzlei)) = 0 THEN
    RAISE EXCEPTION 'Kanzlei darf nicht leer sein';
  END IF;

  SELECT is_tax_advisor INTO _already FROM public.profiles WHERE id = _uid;
  IF _already IS TRUE THEN
    RAISE EXCEPTION 'Bereits als Steuerberater registriert';
  END IF;

  UPDATE public.profiles
    SET is_tax_advisor = true,
        kanzlei = trim(_kanzlei)
    WHERE id = _uid;

  INSERT INTO public.tax_advisor_registrations (user_id, kanzlei)
  VALUES (_uid, trim(_kanzlei))
  RETURNING id INTO _reg_id;

  RETURN _reg_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_as_tax_advisor(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_as_tax_advisor(text) TO authenticated;

-- 3. Profile self-elevation blockieren
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_tax_advisor = (SELECT p.is_tax_advisor FROM public.profiles p WHERE p.id = auth.uid())
    AND is_blocked    = (SELECT p.is_blocked    FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 4. advisor_clients ohne Consent verhindern
DROP POLICY IF EXISTS "Advisors can insert clients" ON public.advisor_clients;

CREATE OR REPLACE FUNCTION public.accept_advisor_link(_client_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _link_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_tax_advisor(_uid) THEN
    RAISE EXCEPTION 'Nur Steuerberater können Mandanten verknüpfen';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.advisor_invitations
    WHERE advisor_id = _uid
      AND client_id = _client_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Keine akzeptierte Einladung für diesen Mandanten';
  END IF;

  INSERT INTO public.advisor_clients (advisor_id, client_id)
  VALUES (_uid, _client_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _link_id;

  RETURN _link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_advisor_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_advisor_link(uuid) TO authenticated;
