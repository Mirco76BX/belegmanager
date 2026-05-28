ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS datev_berater_nr text,
  ADD COLUMN IF NOT EXISTS datev_mandanten_nr text,
  ADD COLUMN IF NOT EXISTS datev_kontenrahmen text CHECK (datev_kontenrahmen IN ('SKR03', 'SKR04')),
  ADD COLUMN IF NOT EXISTS datev_konto_gegenkonto text,
  ADD COLUMN IF NOT EXISTS datev_wj_beginn date,
  ADD COLUMN IF NOT EXISTS datev_sachkontenlaenge integer CHECK (datev_sachkontenlaenge IN (4,5,6,7,8)),
  ADD COLUMN IF NOT EXISTS datev_bezeichnung text,
  ADD COLUMN IF NOT EXISTS datev_diktatkuerzel text;

CREATE INDEX IF NOT EXISTS companies_user_id_idx ON public.companies(user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_advisor_email text,
  ADD COLUMN IF NOT EXISTS tax_advisor_name text;

NOTIFY pgrst, 'reload schema';