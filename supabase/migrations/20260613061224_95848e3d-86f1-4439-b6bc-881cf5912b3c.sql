
-- 1) New column
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS datev_exported_at timestamptz;

-- Backfill historisch festgeschriebene Belege
UPDATE public.receipts
   SET datev_exported_at = COALESCE(exported_at, updated_at, now())
 WHERE accounting_status IN ('exported','verbucht')
   AND datev_exported_at IS NULL;

-- 2) RPC: Status frei wechselbar solange nicht DATEV-festgeschrieben
CREATE OR REPLACE FUNCTION public.update_receipt_accounting_status(_receipt_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _receipt_user_id uuid;
  _current_status text;
  _datev_locked timestamptz;
  _is_owner boolean;
  _is_advisor boolean;
BEGIN
  IF _status NOT IN ('neu','geprüft','open','ready','exported','verbucht') THEN
    RAISE EXCEPTION 'Invalid accounting status: %', _status;
  END IF;

  SELECT user_id, accounting_status, datev_exported_at
    INTO _receipt_user_id, _current_status, _datev_locked
    FROM public.receipts WHERE id = _receipt_id;

  IF _receipt_user_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  _is_owner := (_receipt_user_id = auth.uid());
  _is_advisor := public.is_tax_advisor(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.advisor_clients
      WHERE advisor_id = auth.uid() AND client_id = _receipt_user_id
    );

  IF NOT (_is_owner OR _is_advisor) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- GoBD: nur nach DATEV-Export festgeschrieben
  IF _datev_locked IS NOT NULL AND _status IS DISTINCT FROM _current_status THEN
    RAISE EXCEPTION 'GoBD: Beleg ist mit DATEV-Export am % festgeschrieben und kann nicht mehr geaendert werden', _datev_locked;
  END IF;

  IF _status = _current_status THEN
    RETURN;
  END IF;

  UPDATE public.receipts
     SET accounting_status = _status, updated_at = now()
   WHERE id = _receipt_id;

  INSERT INTO public.receipt_changes (receipt_id, user_id, changed_by, change_type, old_values, new_values)
  VALUES (
    _receipt_id, _receipt_user_id, auth.uid(),
    'status_change',
    jsonb_build_object('accounting_status', _current_status),
    jsonb_build_object('accounting_status', _status)
  );
END;
$function$;

-- 3) Trigger: Inhaltssperre an datev_exported_at koppeln (nicht mehr an Status)
CREATE OR REPLACE FUNCTION public.protect_exported_receipts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.datev_exported_at IS NOT NULL THEN
    -- Einmal gesetzt darf datev_exported_at nicht mehr verändert/zurückgesetzt werden
    IF NEW.datev_exported_at IS DISTINCT FROM OLD.datev_exported_at THEN
      RAISE EXCEPTION 'GoBD: datev_exported_at darf nach Festschreibung nicht mehr veraendert werden';
    END IF;

    IF (NEW.amount IS DISTINCT FROM OLD.amount)
       OR (NEW.amount_eur IS DISTINCT FROM OLD.amount_eur)
       OR (NEW.currency IS DISTINCT FROM OLD.currency)
       OR (NEW.date IS DISTINCT FROM OLD.date)
       OR (NEW.vat_amount IS DISTINCT FROM OLD.vat_amount)
       OR (NEW.vat_rate IS DISTINCT FROM OLD.vat_rate)
       OR (NEW.organization IS DISTINCT FROM OLD.organization)
       OR (NEW.description IS DISTINCT FROM OLD.description)
       OR (NEW.tax_category IS DISTINCT FROM OLD.tax_category)
       OR (NEW.receipt_type IS DISTINCT FROM OLD.receipt_type)
       OR (NEW.company_id IS DISTINCT FROM OLD.company_id)
       OR (NEW.file_path IS DISTINCT FROM OLD.file_path)
       OR (NEW.meeting_purpose IS DISTINCT FROM OLD.meeting_purpose)
       OR (NEW.person_met IS DISTINCT FROM OLD.person_met)
       OR (NEW.license_plate IS DISTINCT FROM OLD.license_plate)
       OR (NEW.mileage IS DISTINCT FROM OLD.mileage)
       OR (NEW.accounting_status IS DISTINCT FROM OLD.accounting_status)
    THEN
      RAISE EXCEPTION 'Beleg ist DATEV-festgeschrieben (% ) und kann nicht mehr geaendert werden (GoBD).', OLD.datev_exported_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_exported_receipts_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.datev_exported_at IS NOT NULL THEN
    RAISE EXCEPTION 'Beleg ist DATEV-festgeschrieben (%) und kann nicht geloescht werden (GoBD § 146 AO).', OLD.datev_exported_at;
  END IF;
  RETURN OLD;
END;
$function$;

-- 4) Privilege escalation: Profil-Policy mit explizitem WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_tax_advisor IS NOT DISTINCT FROM (SELECT p.is_tax_advisor FROM public.profiles p WHERE p.id = auth.uid())
  AND is_blocked IS NOT DISTINCT FROM (SELECT p.is_blocked FROM public.profiles p WHERE p.id = auth.uid())
);
