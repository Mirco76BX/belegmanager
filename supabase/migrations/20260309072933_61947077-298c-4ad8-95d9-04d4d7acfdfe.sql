-- Add accounting_status column to receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS accounting_status text NOT NULL DEFAULT 'neu';

-- Create a security definer function to allow advisors to update accounting_status
CREATE OR REPLACE FUNCTION public.update_receipt_accounting_status(
  _receipt_id uuid,
  _status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _receipt_user_id uuid;
BEGIN
  -- Get the receipt's user_id
  SELECT user_id INTO _receipt_user_id FROM public.receipts WHERE id = _receipt_id;
  
  IF _receipt_user_id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;
  
  -- Check if current user is the owner OR is a tax advisor with access to this client
  IF _receipt_user_id = auth.uid() OR (
    public.is_tax_advisor(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.advisor_clients
      WHERE advisor_id = auth.uid() AND client_id = _receipt_user_id
    )
  ) THEN
    UPDATE public.receipts SET accounting_status = _status, updated_at = now() WHERE id = _receipt_id;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$;