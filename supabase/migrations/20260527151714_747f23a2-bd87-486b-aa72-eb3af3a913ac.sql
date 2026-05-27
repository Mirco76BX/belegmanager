ALTER TABLE public.receipt_changes ADD COLUMN IF NOT EXISTS field_name text;
ALTER TABLE public.receipt_changes ADD COLUMN IF NOT EXISTS old_value text;
ALTER TABLE public.receipt_changes ADD COLUMN IF NOT EXISTS new_value text;
ALTER TABLE public.receipt_changes ADD COLUMN IF NOT EXISTS change_reason text;
NOTIFY pgrst, 'reload schema';