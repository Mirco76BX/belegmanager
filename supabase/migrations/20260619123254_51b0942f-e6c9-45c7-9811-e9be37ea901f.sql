
-- Add scan usage tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scans_used_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scans_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- Atomic increment RPC (SECURITY DEFINER so edge function can call via service role too,
-- but designed to be safe for any authenticated caller on their own row).
CREATE OR REPLACE FUNCTION public.increment_scan_usage(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_count integer;
BEGIN
  UPDATE public.profiles
     SET scans_used_this_month = scans_used_this_month + 1
   WHERE id = _user_id
  RETURNING scans_used_this_month INTO _new_count;
  RETURN _new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_scan_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_scan_usage(uuid) TO service_role;

-- Monthly reset RPC: resets counter if period has rolled over.
-- Accepts an explicit period_start (e.g. Stripe current_period_start for subscribers,
-- or 1st-of-month for FREE/Trial). NEVER decrements; only resets when period_start advances.
CREATE OR REPLACE FUNCTION public.reset_scan_usage_if_new_period(_user_id uuid, _period_start timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET scans_used_this_month = 0,
         scans_period_start = _period_start
   WHERE id = _user_id
     AND _period_start > scans_period_start;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_scan_usage_if_new_period(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_scan_usage_if_new_period(uuid, timestamptz) TO service_role;
