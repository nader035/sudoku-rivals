-- ============================================================================
-- Admin dashboard actions
-- ============================================================================
-- Explicit RPCs for destructive admin actions used by the Angular dashboard.
-- Each function checks is_admin() before touching data.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_delete_room(p_room_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  DELETE FROM rooms
  WHERE id = p_room_id;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION admin_set_player_ban(
  p_player_id UUID,
  p_banned BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE players
  SET
    is_banned = p_banned,
    is_active = NOT p_banned,
    ban_reason = CASE WHEN p_banned THEN COALESCE(p_reason, 'Admin action') ELSE NULL END,
    banned_until = NULL,
    updated_at = NOW()
  WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'banned', p_banned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_delete_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_player_ban(UUID, BOOLEAN, TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Admin dashboard actions installed.';
END $$;
