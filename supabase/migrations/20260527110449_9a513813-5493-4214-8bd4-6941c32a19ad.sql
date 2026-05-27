
-- 1. Client-INSERT entfernen
DROP POLICY IF EXISTS "Users can insert own redemptions" ON public.coupon_redemptions;

-- 2. Defense in depth: Schreibrechte auf der Rolle entziehen (Service-Role bypasst RLS und behält Zugriff)
REVOKE INSERT, UPDATE, DELETE ON public.coupon_redemptions FROM authenticated;

-- 3. Tier-Whitelist
ALTER TABLE public.coupon_redemptions
  DROP CONSTRAINT IF EXISTS coupon_redemptions_tier_check;
ALTER TABLE public.coupon_redemptions
  ADD CONSTRAINT coupon_redemptions_tier_check
  CHECK (tier IN ('relax', 'master'));
