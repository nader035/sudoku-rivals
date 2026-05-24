-- ============================================================================
-- Fix RPC failures caused by ambiguous is_admin() overload resolution.
-- ============================================================================
-- Root cause:
-- - public.is_admin() exists
-- - public.is_admin(uuid DEFAULT auth.uid()) also exists
-- Calling is_admin() becomes ambiguous in some RPC functions.
--
-- Safe fix:
-- - Keep existing overloads unchanged.
-- - Update affected RPCs to call is_admin(auth.uid()) explicitly.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_delete_room(p_room_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
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
  IF NOT is_admin(auth.uid()) THEN
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


CREATE OR REPLACE FUNCTION forfeit_room(
  p_room_id UUID,
  p_player_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_next_host UUID;
  v_player_auth_id UUID;
  v_entry_fee BIGINT;
  v_refunded BOOLEAN := false;
  v_cancelled BOOLEAN := false;
BEGIN
  -- Prevent spoofing another player id from the client.
  IF p_player_id IS DISTINCT FROM current_player_id() AND NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot forfeit for another player');
  END IF;

  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM room_players
    WHERE room_id = p_room_id
      AND player_id = p_player_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player is not in this room');
  END IF;

  v_entry_fee := GREATEST(COALESCE(v_room.entry_fee, 0), 0);
  v_player_auth_id := get_room_user_auth_id(p_player_id);

  -- Before start: refund the player who leaves (host or non-host), once.
  IF v_room.status = 'waiting' AND v_entry_fee > 0 AND v_player_auth_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM wallet_transactions wt
      WHERE wt.user_id = v_player_auth_id
        AND wt.related_match_id = p_room_id
        AND wt.type = 'entry_fee'
        AND wt.status = 'completed'
    ) AND NOT EXISTS (
      SELECT 1
      FROM wallet_transactions wt
      WHERE wt.user_id = v_player_auth_id
        AND wt.related_match_id = p_room_id
        AND wt.type = 'refund'
        AND wt.status = 'completed'
    ) THEN
      PERFORM credit_wallet(
        v_player_auth_id,
        v_entry_fee,
        'refund',
        p_room_id,
        'Refund: player left waiting room before start',
        NULL
      );
      v_refunded := true;

      UPDATE rooms
      SET prize_pool = GREATEST(COALESCE(prize_pool, 0) - v_entry_fee, 0)
      WHERE id = p_room_id;
    END IF;
  END IF;

  -- If match already started, treat leave as forfeit and cancel room.
  IF v_room.status = 'active' THEN
    UPDATE rooms
    SET
      status = 'cancelled',
      finished_at = COALESCE(finished_at, NOW())
    WHERE id = p_room_id;
    v_cancelled := true;
  END IF;

  DELETE FROM room_players
  WHERE room_id = p_room_id
    AND player_id = p_player_id;

  -- If nobody remains, remove the room.
  IF NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id) THEN
    DELETE FROM rooms WHERE id = p_room_id;
    RETURN jsonb_build_object(
      'success', true,
      'deleted', true,
      'refunded', v_refunded,
      'cancelled', v_cancelled
    );
  END IF;

  -- Waiting room host reassignment.
  IF v_room.status = 'waiting' AND v_room.host_id = p_player_id THEN
    SELECT player_id INTO v_next_host
    FROM room_players
    WHERE room_id = p_room_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_next_host IS NOT NULL THEN
      UPDATE rooms
      SET host_id = v_next_host
      WHERE id = p_room_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'left', true,
    'refunded', v_refunded,
    'cancelled', v_cancelled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


GRANT EXECUTE ON FUNCTION admin_delete_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_player_ban(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION forfeit_room(UUID, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Patched RPCs to use is_admin(auth.uid()) and avoid overload ambiguity.';
END $$;

