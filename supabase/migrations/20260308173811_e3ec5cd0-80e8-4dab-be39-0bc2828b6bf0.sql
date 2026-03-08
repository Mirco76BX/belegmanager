ALTER TABLE public.receipts ADD COLUMN vat_amount numeric DEFAULT NULL;
ALTER TABLE public.receipts ADD COLUMN vat_rate numeric DEFAULT NULL;