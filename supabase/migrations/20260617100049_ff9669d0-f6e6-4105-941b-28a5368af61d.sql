
-- 1) advisor_setup_tokens: ensure no INSERT policy for authenticated; revoke insert grant
DROP POLICY IF EXISTS "Users can create advisor_setup_tokens" ON public.advisor_setup_tokens;
DROP POLICY IF EXISTS "Authenticated can insert advisor_setup_tokens" ON public.advisor_setup_tokens;
REVOKE INSERT, UPDATE, DELETE ON public.advisor_setup_tokens FROM authenticated, anon;

-- 2) contact_requests: tighten with CHECK constraints + index
ALTER TABLE public.contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_email_not_empty,
  DROP CONSTRAINT IF EXISTS contact_requests_email_length,
  DROP CONSTRAINT IF EXISTS contact_requests_message_not_empty,
  DROP CONSTRAINT IF EXISTS contact_requests_message_length;

ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_email_not_empty CHECK (email IS NULL OR length(trim(email)) > 0),
  ADD CONSTRAINT contact_requests_email_length    CHECK (email IS NULL OR length(email) <= 254),
  ADD CONSTRAINT contact_requests_message_not_empty CHECK (message IS NULL OR length(trim(message)) > 0),
  ADD CONSTRAINT contact_requests_message_length CHECK (message IS NULL OR length(message) <= 500);

CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx ON public.contact_requests (created_at DESC);

-- 3) Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — only service_role accesses this table.

-- 4) Lock down SECURITY DEFINER functions: revoke PUBLIC execute, grant authenticated only.
-- Trigger functions are invoked by the DB, not via API, but defense in depth.
REVOKE EXECUTE ON FUNCTION public.accept_advisor_link(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_advisor_link(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_tax_advisor(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_tax_advisor(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon_atomic(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.redeem_coupon_atomic(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.register_as_tax_advisor(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.register_as_tax_advisor(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_receipt_accounting_status(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated;

-- Trigger functions: revoke PUBLIC just in case
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_receipt_export() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_datev_exported_at_unset() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_datev_exported_reset() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_status_reset_after_datev_export() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_exported_receipts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_exported_receipts_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC;
