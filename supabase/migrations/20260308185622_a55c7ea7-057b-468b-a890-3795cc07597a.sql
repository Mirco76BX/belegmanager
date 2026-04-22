CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_plate text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, license_plate)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles" ON public.vehicles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own vehicles" ON public.vehicles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own vehicles" ON public.vehicles FOR DELETE USING (user_id = auth.uid());