
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tax_advisor boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kanzlei text;
