
ALTER TABLE public.receipts 
  ADD COLUMN receipt_type text NOT NULL DEFAULT 'general',
  ADD COLUMN license_plate text,
  ADD COLUMN mileage numeric;
