-- ============================================================================
-- Hotfix: pgcrypto gen_salt signature compatibility
-- ============================================================================
-- Some Supabase Postgres environments expose gen_salt(text) but not
-- gen_salt(text, integer). This updates create_room to use gen_salt('bf').
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  v_password_hash TEXT := NULL;
  v_difficulty TEXT;
BEGIN
  v_host_id := current_player_id();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'No current player profile found';
  END IF;

  v_difficulty := lower(trim(COALESCE(p_difficulty, 'medium')));
  IF v_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    v_difficulty := 'medium';
  END IF;

  IF p_is_private THEN
    IF p_password_hash IS NULL OR length(trim(p_password_hash)) = 0 THEN
      RAISE EXCEPTION 'Password is required for private rooms';
    END IF;

    v_password_hash := crypt(trim(p_password_hash), gen_salt('bf'));
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
    v_difficulty,
    p_max_players,
    0,
    'waiting',
    p_is_private,
    v_password_hash,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, INTEGER, BOOLEAN, TEXT, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'create_room updated to use gen_salt(''bf'') signature.';
END $$;
