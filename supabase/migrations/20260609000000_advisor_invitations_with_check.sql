-- ─────────────────────────────────────────────────────────────────────────
--   Security-Hardening: advisor_invitations UPDATE-Policy mit WITH CHECK
-- ─────────────────────────────────────────────────────────────────────────
--
--   Befund (Lovable Security-Scan, von Hand verifiziert 09.06.2026):
--   Die UPDATE-Policy "Clients can respond to invitations" hatte nur USING,
--   kein WITH CHECK. Ein Client konnte damit:
--     a) status auf beliebige Werte setzen (z.B. wieder zu 'pending'
--        zurück, was den Workflow-State kaputt macht)
--     b) advisor_id auf sich selbst umschreiben (Hijack: Mandant wird zu
--        seinem eigenen "Steuerberater")
--     c) client_id/client_email so umschreiben, dass die Invitation einem
--        anderen User zugeordnet wird
--
--   Fix: Policy neu anlegen mit
--     - USING (alte Werte): Client muss berechtigt sein (eigene Invitation)
--     - WITH CHECK (neue Werte): status nur in (accepted, declined),
--       client weiterhin der eigene User, advisor_id != auth.uid()
--       (verhindert Self-Advisor-Hijack)
-- ─────────────────────────────────────────────────────────────────────────

-- Bestehende Policy entfernen
DROP POLICY IF EXISTS "Clients can respond to invitations"
  ON public.advisor_invitations;

-- Neue Policy mit USING + WITH CHECK
CREATE POLICY "Clients can respond to invitations"
  ON public.advisor_invitations
  FOR UPDATE
  USING (
    -- Zugriff auf die Zeile: nur eigene Invitations
    client_id = auth.uid()
    OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Status-Übergang nur in akzeptiert/abgelehnt (kein Re-Open auf pending)
    status IN ('accepted', 'declined')
    -- Client bleibt der eigene User (kein Reassignment auf jemand anderen)
    AND (
      client_id = auth.uid()
      OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
    -- Anti-Hijack: Client darf sich nicht selbst zum Advisor machen
    AND advisor_id <> auth.uid()
  );

-- Audit-Hinweis: zusätzlich loggt der Trigger "GoBD-Audit-Log" jede UPDATE-
-- Aktion auf advisor_invitations bereits über die generic audit-Tabelle
-- (falls aktiv) — keine Zusatz-Triggers nötig.

NOTIFY pgrst, 'reload schema';
