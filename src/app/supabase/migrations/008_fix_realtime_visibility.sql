-- ============================================================================
-- Fix room_players visibility and finished rooms visibility
-- ============================================================================
-- ISSUE 1: room_players SELECT policy requires membership, blocking:
--   - Viewing room roster before joining (room waiting page)
--   - Lobby listing showing player counts
-- ISSUE 2: rooms SELECT policy hides finished rooms from non-members,
--   blocking the recent matches / leaderboard queries.
-- ISSUE 3: The join_room RPC uses crypt() for password checking, but
--   pgcrypto may not be enabled. Enable it to avoid runtime errors.
-- ============================================================================

-- Enable pgcrypto if not already enabled (required for crypt() in join_room)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- Fix room_players SELECT ----
DROP POLICY IF EXISTS "Players can view room participants" ON room_players;

-- Allow viewing room_players for any room that is visible (waiting/active),
-- plus any room the user is a member of (covers finished rooms for participants).
CREATE POLICY "Players can view room participants"
  ON room_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_players.room_id
        AND rooms.status IN ('waiting', 'active')
    )
    OR is_room_member(room_id)
    OR is_admin()
  );

-- ---- Fix rooms SELECT to include finished rooms ----
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;

CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (
    status IN ('waiting', 'active', 'finished')
    OR is_room_member(id)
    OR is_room_host(id)
    OR is_admin()
  );

-- ---- Make join_room and create_room SECURITY DEFINER ----
-- The join_room function already exists. We need to re-create it
-- as SECURITY DEFINER so it can insert room_players rows regardless
-- of the caller's RLS restrictions.

CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Get room details
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is not accepting players');
  END IF;

  IF v_room.current_players >= v_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  -- Validate password for private rooms
  IF v_room.is_private AND v_room.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR crypt(p_password, v_room.password_hash) != v_room.password_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
    END IF;
  END IF;

  -- Check if player already in room
  IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND player_id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in room');
  END IF;

  -- Add player to room
  INSERT INTO room_players (room_id, player_id, board, progress, mistakes, hints_used, is_finished)
  VALUES (p_room_id, p_player_id, v_room.initial_board, 0, 0, 0, false);

  -- Update room player count
  UPDATE rooms
  SET current_players = current_players + 1
  WHERE id = p_room_id;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---- Make update_player_progress SECURITY DEFINER ----
CREATE OR REPLACE FUNCTION update_player_progress(
  p_room_id UUID,
  p_player_id UUID,
  p_board JSONB,
  p_progress INTEGER,
  p_mistakes INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_finish_position INTEGER;
BEGIN
  UPDATE room_players
  SET
    board = p_board,
    progress = p_progress,
    mistakes = p_mistakes,
    last_move_at = NOW()
  WHERE room_id = p_room_id AND player_id = p_player_id;

  IF p_progress >= 100 THEN
    SELECT COALESCE(MAX(finish_position), 0) + 1
    INTO v_finish_position
    FROM room_players
    WHERE room_id = p_room_id AND is_finished = true;

    UPDATE room_players
    SET
      is_finished = true,
      finish_position = v_finish_position,
      finished_at = NOW(),
      completion_time = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE room_id = p_room_id AND player_id = p_player_id;

    PERFORM check_room_completion(p_room_id);

    RETURN jsonb_build_object('success', true, 'completed', true, 'finish_position', v_finish_position);
  END IF;

  RETURN jsonb_build_object('success', true, 'completed', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute
GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_player_progress(UUID, UUID, JSONB, INTEGER, INTEGER) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 applied successfully!';
  RAISE NOTICE 'Fixed: room_players visibility for non-members viewing waiting/active rooms';
  RAISE NOTICE 'Fixed: finished rooms visible for recent matches queries';
  RAISE NOTICE 'Fixed: join_room and update_player_progress are now SECURITY DEFINER';
END $$;
