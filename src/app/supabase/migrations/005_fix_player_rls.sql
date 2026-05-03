-- ============================================================================
-- Fix recursive players RLS policy
-- ============================================================================
-- The original admin policy queried the players table directly, which caused
-- infinite recursion when the API read from players under row-level security.
-- This replacement uses the SECURITY DEFINER helper instead.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all players" ON players;

CREATE POLICY "Admins can manage all players"
  ON players FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
