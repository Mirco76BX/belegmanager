-- Pricing-Overhaul: BASIC / PRO / BUSINESS / CFO + Scan-Pack 50

-- (1) coupon_redemptions tier-Whitelist erweitern
ALTER TABLE public.coupon_redemptions
  DROP CONSTRAINT IF EXISTS coupon_redemptions_tier_check;

ALTER TABLE public.coupon_redemptions
  ADD CONSTRAINT coupon_redemptions_tier_check
  CHECK (tier IN ('relax', 'master', 'basic', 'pro', 'business', 'cfo'));


-- (2) profiles.scan_quota_topup einführen
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_quota_topup integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.scan_quota_topup IS
  'Akkumulierter Scan-Pack-50-Topup. Erhöhung via Stripe-Webhook (checkout.session.completed → Scan-Pack-Produkt) um +50 pro Kauf. Läuft NIE ab. Beim Beleg-Upload wird nach Erschöpfung des monatlichen Tier-Limits dieser Counter dekrementiert (nicht das Tier-Limit selbst).';


-- (3) business_seats — Multi-User für BUSINESS-Tier
CREATE TABLE IF NOT EXISTS public.business_seats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source          text        NOT NULL DEFAULT 'included',
  granted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  note            text,
  CONSTRAINT business_seats_no_self CHECK (owner_id <> seat_user_id),
  CONSTRAINT business_seats_source_check CHECK (source IN ('included', 'addon')),
  CONSTRAINT business_seats_unique_active UNIQUE (owner_id, seat_user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_seats_owner ON public.business_seats (owner_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_business_seats_seat  ON public.business_seats (seat_user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.business_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own seats"
  ON public.business_seats FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can grant seats"
  ON public.business_seats FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can revoke seats"
  ON public.business_seats FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Seat user can read own seat"
  ON public.business_seats FOR SELECT TO authenticated
  USING (seat_user_id = auth.uid());

COMMENT ON TABLE public.business_seats IS
  'Multi-User-Tracking für BUSINESS-Tier. Owner = BUSINESS-Abo-Inhaber. Bis zu 5 Seats inkl. (source=included), darüber pro Seat 4,99 €/Monat als BUSINESS-Add-on-User-Subscription (source=addon). revoked_at gesetzt = Seat inaktiv.';


-- (4) founder_overrides — auditierbare Tier-Grants
CREATE TABLE IF NOT EXISTS public.founder_overrides (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier         text        NOT NULL,
  reason       text,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  granted_by   uuid        REFERENCES auth.users(id),
  expires_at   timestamptz,
  CONSTRAINT founder_overrides_tier_check CHECK (tier IN ('basic', 'pro', 'business', 'cfo')),
  CONSTRAINT founder_overrides_user_unique UNIQUE (user_id)
);

ALTER TABLE public.founder_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own override"
  ON public.founder_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.founder_overrides IS
  'Permanente Tier-Grants ohne Stripe-Subscription. Z.B. Founder (mirco@bakerix.de, m.gruebel@anno76.de) bekommen BUSINESS-Tier ohne Bezahlung. INSERT/UPDATE ausschließlich via Service-Role (Supabase Studio SQL). expires_at NULL = unbefristet.';


-- (5) Seed: Founder-Overrides für Mirco-Accounts
INSERT INTO public.founder_overrides (user_id, tier, reason, granted_at)
SELECT id, 'business', 'Anno 76 GmbH Founder', now()
FROM auth.users
WHERE email IN ('mirco@bakerix.de', 'm.gruebel@anno76.de')
ON CONFLICT (user_id) DO NOTHING;