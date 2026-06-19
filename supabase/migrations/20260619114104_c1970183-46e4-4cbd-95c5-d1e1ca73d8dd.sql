REVOKE EXECUTE ON FUNCTION public.set_trial_started_at_on_signup() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_datev_exported_at_unset() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_datev_exported_reset() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_status_reset_after_datev_export() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM authenticated;