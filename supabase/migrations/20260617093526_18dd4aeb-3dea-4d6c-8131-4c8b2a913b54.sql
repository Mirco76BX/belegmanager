-- GoBD-Festschreibung: DATEV-exportierte Belege sind unveränderlich
-- unabhängig vom accounting_status-Wert.

DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;

CREATE POLICY "Users can update own receipts"
  ON public.receipts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND datev_exported_at IS NULL
    AND accounting_status NOT IN ('exported', 'verbucht')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND datev_exported_at IS NULL
    AND accounting_status NOT IN ('exported', 'verbucht')
  );

-- Defense in depth: explicit trigger preventing datev_exported_at from being NULLed
CREATE OR REPLACE FUNCTION public.prevent_datev_exported_at_unset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.datev_exported_at IS NOT NULL AND NEW.datev_exported_at IS NULL THEN
    RAISE EXCEPTION 'GoBD: datev_exported_at darf nach Festschreibung nicht auf NULL gesetzt werden (§ 146 AO Unveraenderbarkeit)';
  END IF;
  IF OLD.datev_exported_at IS NOT NULL
     AND NEW.datev_exported_at IS NOT NULL
     AND NEW.datev_exported_at <> OLD.datev_exported_at THEN
    RAISE EXCEPTION 'GoBD: datev_exported_at darf nach Festschreibung nicht mehr veraendert werden (§ 146 AO Unveraenderbarkeit)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_datev_exported_at_unset ON public.receipts;
CREATE TRIGGER trg_prevent_datev_exported_at_unset
  BEFORE UPDATE OF datev_exported_at ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_datev_exported_at_unset();