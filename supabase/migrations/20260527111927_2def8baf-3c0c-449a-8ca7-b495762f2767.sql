CREATE TABLE public.scan_rate_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scan_rate_log_user_time ON public.scan_rate_log (user_id, created_at DESC);
GRANT ALL ON public.scan_rate_log TO service_role;
ALTER TABLE public.scan_rate_log ENABLE ROW LEVEL SECURITY;
-- No client policies: only service_role writes/reads via scan-receipt edge function.