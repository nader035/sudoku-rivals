-- ============================================================================
-- RPC: create_room
-- ============================================================================
-- Creates a room and the host's room_players row in one SECURITY DEFINER call.
-- This avoids client-side RLS failures during guest room creation.
-- ============================================================================

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
    1,
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

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_room(
  TEXT,
  TEXT,
  INTEGER,
  BOOLEAN,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  BOOLEAN,
  BOOLEAN,
  INTEGER,
  INTEGER,
  INTEGER
) TO authenticated, anon;

COMMENT ON FUNCTION create_room(TEXT, TEXT, INTEGER, BOOLEAN, TEXT, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER)
  IS 'Create a room and join the creator as host in a single SECURITY DEFINER transaction';
