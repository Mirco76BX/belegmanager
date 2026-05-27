
-- 1. receipts: add columns (accounting_status already exists with default 'neu' — keep but extend allowed values)
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS export_batch_id uuid,
  ADD COLUMN IF NOT EXISTS exported_at timestamptz;

-- Adjust default and add CHECK (preserve existing 'neu' values for non-destructiveness)
ALTER TABLE public.receipts ALTER COLUMN accounting_status SET DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipts_accounting_status_check'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_accounting_status_check
      CHECK (accounting_status IN ('neu','open','ready','exported','verbucht'));
  END IF;
END $$;

-- 2. datev_export_batches
CREATE TABLE IF NOT EXISTS public.datev_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  receipt_count integer NOT NULL DEFAULT 0,
  total_amount_eur numeric,
  date_from date,
  date_to date,
  file_name text,
  notes text
);

GRANT SELECT, INSERT ON public.datev_export_batches TO authenticated;
GRANT ALL ON public.datev_export_batches TO service_role;

ALTER TABLE public.datev_export_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='datev_export_batches' AND policyname='Users can view own export batches') THEN
    CREATE POLICY "Users can view own export batches" ON public.datev_export_batches
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='datev_export_batches' AND policyname='Users can insert own export batches') THEN
    CREATE POLICY "Users can insert own export batches" ON public.datev_export_batches
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. receipt_changes (audit log; insert/select only)
CREATE TABLE IF NOT EXISTS public.receipt_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  changed_by uuid,
  change_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_changes_receipt_id ON public.receipt_changes(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_changes_user_id ON public.receipt_changes(user_id);

GRANT SELECT, INSERT ON public.receipt_changes TO authenticated;
GRANT ALL ON public.receipt_changes TO service_role;

ALTER TABLE public.receipt_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receipt_changes' AND policyname='Users can view own receipt changes') THEN
    CREATE POLICY "Users can view own receipt changes" ON public.receipt_changes
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receipt_changes' AND policyname='Users can insert own receipt changes') THEN
    CREATE POLICY "Users can insert own receipt changes" ON public.receipt_changes
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4a. Trigger: protect exported/verbucht receipts from content changes
CREATE OR REPLACE FUNCTION public.protect_exported_receipts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.accounting_status IN ('exported','verbucht') THEN
    -- Allow only status transitions and metadata fields; block content changes
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
    THEN
      RAISE EXCEPTION 'Beleg ist festgeschrieben (%) und kann inhaltlich nicht mehr geändert werden (GoBD).', OLD.accounting_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_exported_receipts ON public.receipts;
CREATE TRIGGER protect_exported_receipts
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.protect_exported_receipts();

-- 4b. Trigger: log export/festschreibung
CREATE OR REPLACE FUNCTION public.log_receipt_export()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.accounting_status IS DISTINCT FROM NEW.accounting_status)
     AND NEW.accounting_status IN ('exported','verbucht') THEN
    INSERT INTO public.receipt_changes (receipt_id, user_id, changed_by, change_type, old_values, new_values)
    VALUES (
      NEW.id,
      NEW.user_id,
      auth.uid(),
      'festschreibung_' || NEW.accounting_status,
      jsonb_build_object('accounting_status', OLD.accounting_status, 'export_batch_id', OLD.export_batch_id, 'exported_at', OLD.exported_at),
      jsonb_build_object('accounting_status', NEW.accounting_status, 'export_batch_id', NEW.export_batch_id, 'exported_at', NEW.exported_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_receipt_export ON public.receipts;
CREATE TRIGGER log_receipt_export
  AFTER UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_receipt_export();
