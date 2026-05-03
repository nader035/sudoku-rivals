-- ============================================================================
-- Fix: current_players double-counting in create_room and join_room
-- ============================================================================
-- ROOT CAUSE:
--   Trigger `update_room_player_count_on_insert` increments current_players
--   on every room_players INSERT. But both `create_room` and `join_room` RPCs
--   ALSO manually set/increment current_players, causing double-counting.
--
--   create_room: sets current_players = 1 + trigger adds 1 = 2 (should be 1)
--   join_room:   manual +1 + trigger +1 = double increment (should be +1)
--
-- FIX:
--   - create_room: set current_players = 0, let trigger handle the +1
--   - join_room: remove manual UPDATE current_players, let trigger handle it
-- ============================================================================

-- ---- Fix create_room RPC ----
CREATE OR REPLACE FUNCTION create_room(
  p_name TEXT,
  p_difficulty TEXT,
  p_max_players INTEGER,
  p_is_private BOOLEAN,
  p_password_hash TEXT,
  p_puzzle JSONB,
  p_solution JSONB,
  p_initial_board JSONB,
  p_allow_hints BOOLEAN,
  p_allow_mistakes BOOLEAN,
  p_max_mistakes INTEGER,
  p_freeze_duration INTEGER,
  p_mega_freeze_duration INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_host_id UUID;
  v_room_id UUID;
BEGIN
  v_host_id := current_player_id();

  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'No current player profile found';
  END IF;

  INSERT INTO rooms (
    name,
    difficulty,
    max_players,
    current_players,
    status,
    is_private,
    password_hash,
    host_id,
    puzzle,
    solution,
    initial_board,
    allow_hints,
    allow_mistakes,
    max_mistakes,
    freeze_duration,
    mega_freeze_duration
  )
  VALUES (
    trim(p_name),
    p_difficulty,
    p_max_players,
    0,  -- ← was 1, now 0. Trigger will add +1 when room_players row is inserted below.
    'waiting',
    p_is_private,
    p_password_hash,
    v_host_id,
    p_puzzle,
    p_solution,
    p_initial_board,
    p_allow_hints,
    p_allow_mistakes,
    p_max_mistakes,
    p_freeze_duration,
    p_mega_freeze_duration
  )
  RETURNING id INTO v_room_id;

  INSERT INTO room_players (
    room_id,
    player_id,
    progress,
    mistakes,
    hints_used,
    board,
    frozen_until,
    mega_freeze_count,
    is_finished,
    finish_position,
    completion_time,
    started_at,
    finished_at,
    last_move_at
  )
  VALUES (
    v_room_id,
    v_host_id,
    0,
    0,
    0,
    p_initial_board,
    NULL,
    0,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );
  -- ↑ The trigger update_room_player_count_on_insert will set current_players = 1

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---- Fix join_room RPC ----
CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
BEGIN
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

  IF v_room.is_private AND v_room.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR crypt(p_password, v_room.password_hash) != v_room.password_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND player_id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in room');
  END IF;

  INSERT INTO room_players (room_id, player_id, board, progress, mistakes, hints_used, is_finished)
  VALUES (p_room_id, p_player_id, v_room.initial_board, 0, 0, 0, false);
  -- ↑ The trigger update_room_player_count_on_insert will handle current_players + 1
  -- ↑ REMOVED the manual: UPDATE rooms SET current_players = current_players + 1

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---- Fix any existing rooms with wrong current_players ----
-- This repairs rooms that were created with the double-counting bug.
UPDATE rooms r
SET current_players = (
  SELECT COUNT(*)
  FROM room_players rp
  WHERE rp.room_id = r.id
)
WHERE r.status IN ('waiting', 'active');


-- ---- Grant execute ----
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, INTEGER, BOOLEAN, TEXT, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009 applied!';
  RAISE NOTICE 'Fixed: create_room no longer double-counts (was setting 1 + trigger = 2)';
  RAISE NOTICE 'Fixed: join_room no longer double-counts (was manual +1 + trigger = +2)';
  RAISE NOTICE 'Fixed: existing rooms repaired to correct player counts';
END $$;
