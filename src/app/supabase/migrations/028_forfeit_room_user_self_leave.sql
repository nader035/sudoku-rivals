-- ============================================================================
-- Ensure normal users can always forfeit/leave as themselves.
-- Admins may still target another player id when needed.
-- ============================================================================

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
  v_actor_player_id UUID;
  v_is_admin BOOLEAN := is_admin(auth.uid());
BEGIN
  -- Default actor is the authenticated caller's own player id.
  v_actor_player_id := current_player_id();

  IF v_actor_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player profile not found');
  END IF;

  -- Admin can target another player; non-admin always acts as self.
  IF v_is_admin AND p_player_id IS NOT NULL THEN
    v_actor_player_id := p_player_id;
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
      AND player_id = v_actor_player_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player is not in this room');
  END IF;

  v_entry_fee := GREATEST(COALESCE(v_room.entry_fee, 0), 0);
  v_player_auth_id := get_room_user_auth_id(v_actor_player_id);

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
    AND player_id = v_actor_player_id;

  -- If nobody remains, remove the room.
  IF NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id) THEN
    DELETE FROM rooms WHERE id = p_room_id;
    RETURN jsonb_build_object(
      'success', true,
      'player_id', v_actor_player_id,
      'deleted', true,
      'refunded', v_refunded,
      'cancelled', v_cancelled
    );
  END IF;

  -- Waiting room host reassignment.
  IF v_room.status = 'waiting' AND v_room.host_id = v_actor_player_id THEN
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
    'player_id', v_actor_player_id,
    'left', true,
    'refunded', v_refunded,
    'cancelled', v_cancelled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION forfeit_room(UUID, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'forfeit_room now lets normal users always leave as self; admins can target others.';
END $$;

