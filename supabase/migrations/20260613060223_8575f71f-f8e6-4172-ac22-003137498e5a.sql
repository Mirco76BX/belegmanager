CREATE OR REPLACE FUNCTION public.update_receipt_accounting_status(_receipt_id uuid, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _receipt_user_id uuid;
  _current_status text;
  _is_owner boolean;
  _is_advisor boolean;
BEGIN
  IF _status NOT IN ('neu','geprüft','open','ready','exported','verbucht') THEN
    RAISE EXCEPTION 'Invalid accounting status: %', _status;
  END IF;

  SELECT user_id, accounting_status INTO _receipt_user_id, _current_status
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

  -- GoBD: festgeschriebene Belege dürfen nicht zurückgesetzt werden
  IF _current_status IN ('verbucht','exported') AND _status <> _current_status THEN
    RAISE EXCEPTION 'GoBD: Festgeschriebene Belege koennen nicht geaendert werden (aktueller Status: %)', _current_status;
  END IF;

  -- Keine Rückwärts-Übergänge im Workflow neu -> geprüft -> verbucht
  IF _current_status = 'geprüft' AND _status = 'neu' THEN
    RAISE EXCEPTION 'GoBD: Rueckwaerts-Uebergang von geprueft auf neu ist nicht erlaubt';
  END IF;

  UPDATE public.receipts
    SET accounting_status = _status, updated_at = now()
    WHERE id = _receipt_id;

  -- Audit-Log
  INSERT INTO public.receipt_changes (receipt_id, user_id, changed_by, change_type, old_values, new_values)
  VALUES (
    _receipt_id,
    _receipt_user_id,
    auth.uid(),
    'status_change',
    jsonb_build_object('accounting_status', _current_status),
    jsonb_build_object('accounting_status', _status)
  );
END;
$function$;