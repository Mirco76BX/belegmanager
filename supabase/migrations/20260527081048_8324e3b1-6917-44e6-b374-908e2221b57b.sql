
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_accounting_status_check;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_accounting_status_check
  CHECK (accounting_status IN ('open','ready','exported','verbucht'));
