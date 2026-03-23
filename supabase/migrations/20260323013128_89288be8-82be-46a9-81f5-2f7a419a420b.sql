
CREATE TABLE public.custom_purposes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);

ALTER TABLE public.custom_purposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom purposes" ON public.custom_purposes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own custom purposes" ON public.custom_purposes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own custom purposes" ON public.custom_purposes FOR DELETE TO authenticated USING (user_id = auth.uid());
