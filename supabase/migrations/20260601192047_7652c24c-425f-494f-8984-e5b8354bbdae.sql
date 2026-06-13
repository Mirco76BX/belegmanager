ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS festschreibung_default smallint NOT NULL DEFAULT 0
  CHECK (festschreibung_default IN (0,1));