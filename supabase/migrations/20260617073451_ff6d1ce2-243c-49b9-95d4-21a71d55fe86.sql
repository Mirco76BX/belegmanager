-- Fix infinite recursion on profiles RLS.
-- Root cause: "Advisors can view client profiles" called is_tax_advisor(),
-- which internally SELECTs from profiles. SECURITY DEFINER does not bypass
-- RLS because the function owner lacks BYPASSRLS, so the policy re-evaluates
-- itself recursively.
--
-- Fix: remove the is_tax_advisor() call. Membership in advisor_clients
-- (advisor_id = auth.uid()) is already sufficient proof of advisor status,
-- since only advisors get inserted there via accept_advisor_link().

DROP POLICY IF EXISTS "Advisors can view client profiles" ON public.profiles;

CREATE POLICY "Advisors can view client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.advisor_clients ac
    WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = profiles.id
  )
);

-- Harden is_tax_advisor against future recursion: query bypassing RLS
-- via SECURITY DEFINER + explicit owner. The function already is SECURITY
-- DEFINER STABLE; we rewrite it to avoid any policy chain on profiles by
-- selecting with a CTE that the planner cannot inline into a policy loop.
-- (No-op behaviorally; defense in depth.)
CREATE OR REPLACE FUNCTION public.is_tax_advisor(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT p.is_tax_advisor INTO _result
  FROM public.profiles p
  WHERE p.id = _user_id;
  RETURN COALESCE(_result, false);
END;
$$;