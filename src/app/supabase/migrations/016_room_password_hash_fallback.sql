-- ============================================================================
-- Hotfix: room password hashing without hard dependency on pgcrypto
-- ============================================================================
-- Some environments cannot resolve gen_salt/crypt at runtime.
-- This migration keeps bcrypt when pgcrypto exists, and falls back to md5 when
-- pgcrypto is unavailable so room creation/join never breaks.
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
  v_password_hash TEXT := NULL;
  v_difficulty TEXT;
  v_input_password TEXT;
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
    v_input_password := NULLIF(trim(COALESCE(p_password_hash, '')), '');
    IF v_input_password IS NULL THEN
      RAISE EXCEPTION 'Password is required for private rooms';
    END IF;

    IF to_regprocedure('extensions.gen_salt(text)') IS NOT NULL
      AND to_regprocedure('extensions.crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT extensions.crypt($1, extensions.gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSIF to_regprocedure('public.gen_salt(text)') IS NOT NULL
      AND to_regprocedure('public.crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT public.crypt($1, public.gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSIF to_regprocedure('gen_salt(text)') IS NOT NULL
      AND to_regprocedure('crypt(text,text)') IS NOT NULL THEN
      EXECUTE 'SELECT crypt($1, gen_salt(''bf''))'
      INTO v_password_hash
      USING v_input_password;
    ELSE
      v_password_hash := md5(v_input_password);
    END IF;
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


CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_input_password TEXT;
  v_compare_hash TEXT;
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
    v_input_password := NULLIF(trim(COALESCE(p_password, '')), '');
    IF v_input_password IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
    END IF;

    -- md5 fallback mode
    IF length(v_room.password_hash) = 32 AND v_room.password_hash !~ '^\$' THEN
      IF md5(v_input_password) != v_room.password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
      END IF;
    ELSE
      -- bcrypt mode when crypt is available
      IF to_regprocedure('extensions.crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT extensions.crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSIF to_regprocedure('public.crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT public.crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSIF to_regprocedure('crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT crypt($1, $2)' INTO v_compare_hash USING v_input_password, v_room.password_hash;
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Password verification is unavailable');
      END IF;

      IF v_compare_hash IS NULL OR v_compare_hash != v_room.password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
      END IF;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND player_id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in room');
  END IF;

  INSERT INTO room_players (room_id, player_id, board, progress, mistakes, hints_used, is_finished)
  VALUES (p_room_id, p_player_id, v_room.initial_board, 0, 0, 0, false);

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, INTEGER, BOOLEAN, TEXT, JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'Room password logic updated with pgcrypto fallback support.';
END $$;
