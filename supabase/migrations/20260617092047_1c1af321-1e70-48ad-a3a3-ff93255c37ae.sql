
-- Härtung RLS: DATEV-festgeschriebene Belege (datev_exported_at IS NOT NULL)
-- sind unabhängig vom accounting_status auf RLS-Ebene gegen UPDATE/DELETE gesperrt.

DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
CREATE POLICY "Users can update own receipts"
ON public.receipts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND datev_exported_at IS NULL
  AND accounting_status <> ALL (ARRAY['exported'::text, 'verbucht'::text])
)
WITH CHECK (
  user_id = auth.uid()
  AND datev_exported_at IS NULL
  AND accounting_status <> ALL (ARRAY['exported'::text, 'verbucht'::text])
);

DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;
CREATE POLICY "Users can delete own receipts"
ON public.receipts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND datev_exported_at IS NULL
  AND accounting_status <> ALL (ARRAY['exported'::text, 'verbucht'::text])
);

-- Trigger-Härtung: Reset von accounting_status zurück auf 'neu'/'geprüft'/'open'/'ready'
-- ist verboten sobald datev_exported_at gesetzt ist. (Ergänzt protect_exported_receipts
-- als expliziter Schutz speziell gegen Status-Downgrade-Angriffe.)
CREATE OR REPLACE FUNCTION public.prevent_status_reset_after_datev_export()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.datev_exported_at IS NOT NULL
     AND NEW.accounting_status IS DISTINCT FROM OLD.accounting_status
     AND NEW.accounting_status IN ('neu','geprüft','open','ready') THEN
    RAISE EXCEPTION
      'GoBD: accounting_status kann nach DATEV-Export (%) nicht zurückgesetzt werden',
      OLD.datev_exported_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_status_reset_after_datev_export ON public.receipts;
CREATE TRIGGER trg_prevent_status_reset_after_datev_export
BEFORE UPDATE OF accounting_status ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_status_reset_after_datev_export();
