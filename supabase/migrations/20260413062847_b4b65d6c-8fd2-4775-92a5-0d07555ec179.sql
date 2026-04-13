
-- Table for multiple VAT line items per receipt
CREATE TABLE public.receipt_vat_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  label TEXT,
  net_amount NUMERIC,
  vat_rate NUMERIC NOT NULL,
  vat_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_vat_items ENABLE ROW LEVEL SECURITY;

-- Users can view VAT items of their own receipts
CREATE POLICY "Users can view own receipt vat items"
ON public.receipt_vat_items
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())
);

-- Users can insert VAT items for their own receipts
CREATE POLICY "Users can insert own receipt vat items"
ON public.receipt_vat_items
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())
);

-- Users can update VAT items of their own receipts
CREATE POLICY "Users can update own receipt vat items"
ON public.receipt_vat_items
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())
);

-- Users can delete VAT items of their own receipts
CREATE POLICY "Users can delete own receipt vat items"
ON public.receipt_vat_items
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid())
);

-- Advisors can view client receipt VAT items
CREATE POLICY "Advisors can view client receipt vat items"
ON public.receipt_vat_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_id
    AND (
      r.user_id = auth.uid()
      OR (
        public.is_tax_advisor(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.advisor_clients ac
          WHERE ac.advisor_id = auth.uid() AND ac.client_id = r.user_id
        )
      )
    )
  )
);

-- Index for fast lookups
CREATE INDEX idx_receipt_vat_items_receipt_id ON public.receipt_vat_items(receipt_id);
