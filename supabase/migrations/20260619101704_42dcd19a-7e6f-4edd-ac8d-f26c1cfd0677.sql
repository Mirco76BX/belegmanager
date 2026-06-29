-- Trial-Lifecycle: 1-Monats-Trial + harter Block + Cleanup-Tracking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS trial_blocked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

COMMENT ON COLUMN public.profiles.trial_started_at IS
  'Trial-Start, gesetzt bei Signup via Trigger. Trial dauert 30 Tage. NULL für Accounts vor Trial-Migration.';
COMMENT ON COLUMN public.profiles.trial_blocked_at IS
  'Zeitpunkt der Account-Sperre (ab Tag 32 nach trial_started_at). Wird von check-subscription Edge Function gesetzt. NULL = nicht blockiert.';
COMMENT ON COLUMN public.profiles.scheduled_deletion_at IS
  'Geplanter Account-Löschzeitpunkt (4 Wochen nach trial_blocked_at). Wird vom Cleanup-Job geprüft. NULL = nicht zur Löschung vorgesehen.';

CREATE OR REPLACE FUNCTION public.set_trial_started_at_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_trial_started_at_on_signup() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_set_trial_started_at ON public.profiles;
CREATE TRIGGER profiles_set_trial_started_at
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_started_at_on_signup();

CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion
  ON public.profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_blocked
  ON public.profiles (trial_blocked_at)
  WHERE trial_blocked_at IS NOT NULL;
