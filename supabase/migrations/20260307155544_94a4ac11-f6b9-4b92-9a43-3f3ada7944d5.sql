
ALTER TABLE public.profiles ADD COLUMN default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
