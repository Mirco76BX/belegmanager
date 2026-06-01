-- Fix: revoke PUBLIC/anon execute on trigger-only SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon;

-- Fix: atomic coupon redemption to prevent race conditions on max_uses
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(_user_id uuid, _code text)
RETURNS TABLE(tier text, expires_at timestamptz, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon record;
  _expires timestamptz;
BEGIN
  -- Atomically claim a slot: only increment if active and under max_uses
  UPDATE public.coupons c
    SET used_count = c.used_count + 1
    WHERE lower(c.code) = lower(_code)
      AND c.is_active = true
      AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    RETURNING c.* INTO _coupon;

  IF _coupon.id IS NULL THEN
    -- Either not found, inactive, or exhausted
    IF EXISTS (SELECT 1 FROM public.coupons WHERE lower(code) = lower(_code)) THEN
      RETURN QUERY SELECT NULL::text, NULL::timestamptz, 'Gutscheincode bereits ausgeschöpft'::text;
    ELSE
      RETURN QUERY SELECT NULL::text, NULL::timestamptz, 'Ungültiger Gutscheincode'::text;
    END IF;
    RETURN;
  END IF;

  -- Check duplicate redemption for this user
  IF EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE user_id = _user_id AND coupon_id = _coupon.id
  ) THEN
    -- Rollback the increment
    UPDATE public.coupons SET used_count = used_count - 1 WHERE id = _coupon.id;
    RETURN QUERY SELECT NULL::text, NULL::timestamptz, 'Gutschein bereits eingelöst'::text;
    RETURN;
  END IF;

  _expires := now() + (_coupon.duration_days || ' days')::interval;

  INSERT INTO public.coupon_redemptions (user_id, coupon_id, tier, expires_at)
  VALUES (_user_id, _coupon.id, _coupon.tier, _expires);

  RETURN QUERY SELECT _coupon.tier::text, _expires, NULL::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon_atomic(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_atomic(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';