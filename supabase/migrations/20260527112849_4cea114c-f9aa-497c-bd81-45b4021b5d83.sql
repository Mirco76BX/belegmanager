
-- 1. Storage policies for receipts bucket
DROP POLICY IF EXISTS "Users can view own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Receipts select own" ON storage.objects;
DROP POLICY IF EXISTS "Receipts insert own" ON storage.objects;
DROP POLICY IF EXISTS "Receipts update own" ON storage.objects;
DROP POLICY IF EXISTS "Receipts delete own" ON storage.objects;

-- SELECT: owner or linked advisor
CREATE POLICY "Receipts files select owner or advisor"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      public.is_tax_advisor(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.advisor_clients ac
        WHERE ac.advisor_id = auth.uid()
          AND ac.client_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

-- INSERT: owner only, in own folder
CREATE POLICY "Receipts files insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: fully blocked (GoBD: files are immutable originals)
CREATE POLICY "Receipts files update blocked"
ON storage.objects FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE: only owner, and only if related receipt is not festgeschrieben
CREATE POLICY "Receipts files delete owner if not festgeschrieben"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.file_path = storage.objects.name
      AND r.accounting_status IN ('exported', 'verbucht')
  )
);

-- 2. Trigger: block DELETE on festgeschriebene receipts (GoBD)
CREATE OR REPLACE FUNCTION public.protect_exported_receipts_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.accounting_status IN ('exported', 'verbucht') THEN
    RAISE EXCEPTION 'Beleg ist festgeschrieben (%) und kann nicht gelöscht werden (GoBD § 146 AO).', OLD.accounting_status;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_exported_receipts_delete ON public.receipts;
CREATE TRIGGER trg_protect_exported_receipts_delete
BEFORE DELETE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.protect_exported_receipts_delete();
