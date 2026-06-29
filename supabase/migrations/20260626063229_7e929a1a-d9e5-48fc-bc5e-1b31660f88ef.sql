REVOKE EXECUTE ON FUNCTION public.increment_scan_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_usage(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reset_scan_usage_if_new_period(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_scan_usage_if_new_period(uuid, timestamptz) TO service_role;