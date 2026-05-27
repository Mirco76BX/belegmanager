-- ─────────────────────────────────────────────────────────────────────────
--   GoBD-Compliance: Audit-Log + Festschreibung
-- ─────────────────────────────────────────────────────────────────────────
--
--   Quelle: BMF-Schreiben „Grundsätze zur ordnungsmäßigen Führung und
--           Aufbewahrung von Büchern…" (GoBD), § 146 Abs. 4 AO.
--
--   Ziel:
--     1. Jede inhaltliche Änderung an einem Beleg wird mit Audit-Eintrag
--        (Vorher/Nachher, User, Timestamp, Grund) protokolliert.
--     2. Belege können nach Aufnahme in einen Produktiv-DATEV-Stapel
--        festgeschrieben werden — danach sind sie nicht mehr editierbar.
--     3. DATEV-Exports selbst werden als Vorgang dokumentiert.
--
-- ─────────────────────────────────────────────────────────────────────────

-- ─── 1. receipts: accounting_status + export_batch_id sicherstellen ──────

-- accounting_status existiert ggf. schon (siehe Lib-Code), wir nehmen
-- defensive Variante: nur anlegen, wenn nicht vorhanden.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receipts'
      AND column_name = 'accounting_status'
  ) THEN
    ALTER TABLE public.receipts
      ADD COLUMN accounting_status text NOT NULL DEFAULT 'open'
      CHECK (accounting_status IN ('open', 'ready', 'exported', 'verbucht'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receipts'
      AND column_name = 'export_batch_id'
  ) THEN
    ALTER TABLE public.receipts
      ADD COLUMN export_batch_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receipts'
      AND column_name = 'exported_at'
  ) THEN
    ALTER TABLE public.receipts
      ADD COLUMN exported_at timestamptz;
  END IF;
END$$;

-- ─── 2. DATEV-Export-Batches dokumentieren ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.datev_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exported_at timestamptz NOT NULL DEFAULT now(),
  berater_nr text NOT NULL,
  mandanten_nr text NOT NULL,
  wj_beginn date NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  kontenrahmen text NOT NULL CHECK (kontenrahmen IN ('SKR03', 'SKR04')),
  receipt_count integer NOT NULL,
  buchung_count integer NOT NULL,
  filename text NOT NULL,
  notes text
);

ALTER TABLE public.datev_export_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export batches"
  ON public.datev_export_batches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own export batches"
  ON public.datev_export_batches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Festschreibungen sind UNVERÄNDERBAR (kein UPDATE, kein DELETE)
-- Es gibt absichtlich KEINE UPDATE/DELETE-Policies.

-- ─── 3. Audit-Log für Beleg-Änderungen ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.receipt_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_reason text,
  change_type text NOT NULL DEFAULT 'edit'
    CHECK (change_type IN ('edit', 'create', 'export', 'unlock', 'storno'))
);

CREATE INDEX IF NOT EXISTS receipt_changes_receipt_id_idx
  ON public.receipt_changes(receipt_id);

CREATE INDEX IF NOT EXISTS receipt_changes_user_id_changed_at_idx
  ON public.receipt_changes(user_id, changed_at DESC);

ALTER TABLE public.receipt_changes ENABLE ROW LEVEL SECURITY;

-- Lesen: User darf nur Audit-Einträge seiner eigenen Belege sehen
CREATE POLICY "Users can view own receipt changes"
  ON public.receipt_changes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  );

-- Schreiben: User darf nur Einträge zu seinen eigenen Belegen anlegen
CREATE POLICY "Users can insert own receipt changes"
  ON public.receipt_changes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  );

-- Audit-Einträge sind UNVERÄNDERBAR (keine UPDATE/DELETE-Policies)

-- ─── 4. Schutz-Trigger: Festgeschriebene Belege dürfen nicht editiert ──

CREATE OR REPLACE FUNCTION public.protect_exported_receipts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wenn ein Beleg bereits 'exported' oder 'verbucht' ist, blocken wir
  -- inhaltliche Änderungen. Erlaubt bleiben nur Statuswechsel und
  -- accounting_status-Updates durch System-Trigger.
  IF OLD.accounting_status IN ('exported', 'verbucht')
     AND NEW.accounting_status = OLD.accounting_status
  THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.tax_category IS DISTINCT FROM OLD.tax_category
       OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate
       OR NEW.vat_amount IS DISTINCT FROM OLD.vat_amount
       OR NEW.person_met IS DISTINCT FROM OLD.person_met
       OR NEW.organization IS DISTINCT FROM OLD.organization
       OR NEW.meeting_purpose IS DISTINCT FROM OLD.meeting_purpose
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
    THEN
      RAISE EXCEPTION
        'GoBD-Schutz: Beleg % ist bereits in DATEV-Stapel % festgeschrieben (am %). Änderungen sind nicht erlaubt. Für Korrekturen bitte einen Storno-Beleg anlegen.',
        OLD.id, OLD.export_batch_id, OLD.exported_at
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS protect_exported_receipts_trigger ON public.receipts;
CREATE TRIGGER protect_exported_receipts_trigger
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_exported_receipts();

-- ─── 5. Trigger: Audit-Log bei Festschreibung ───────────────────────────

CREATE OR REPLACE FUNCTION public.log_receipt_export()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wenn ein Beleg neu auf 'exported' gesetzt wird, schreibe Audit-Eintrag
  IF NEW.accounting_status = 'exported'
     AND (OLD.accounting_status IS NULL OR OLD.accounting_status <> 'exported')
  THEN
    INSERT INTO public.receipt_changes (
      receipt_id, user_id, field_name, old_value, new_value,
      change_type, change_reason
    ) VALUES (
      NEW.id, NEW.user_id, 'accounting_status',
      COALESCE(OLD.accounting_status, 'open'), 'exported',
      'export',
      'DATEV-Stapel ' || COALESCE(NEW.export_batch_id::text, '(ohne batch)')
    );
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS log_receipt_export_trigger ON public.receipts;
CREATE TRIGGER log_receipt_export_trigger
  AFTER UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_receipt_export();
