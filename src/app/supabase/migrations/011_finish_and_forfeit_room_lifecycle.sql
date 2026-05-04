-- ============================================================================
-- Fix room lifecycle: first finisher wins, active forfeits cancel the room
-- ============================================================================
-- The lobby lists waiting/active rooms. A completed match should leave that
-- list as soon as the first player solves it, and an active forfeit should
-- close the match for everyone instead of trying to delete a room_players row.
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_room_with_winner(
  p_room_id UUID,
  p_winner_id UUID,
  p_winning_time INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_room RECORD;
  v_participant RECORD;
  v_player_count INTEGER;
  v_total_mistakes INTEGER;
  v_total_hints_used INTEGER;
  v_average_completion_time INTEGER;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;

  IF NOT FOUND OR v_room.status != 'active' THEN
    RETURN;
  END IF;

  UPDATE rooms
  SET
    status = 'finished',
    finished_at = NOW(),
    winner_id = p_winner_id,
    winning_time = p_winning_time
  WHERE id = p_room_id;

  SELECT
    COUNT(rp.player_id)::INTEGER,
    COALESCE(SUM(rp.mistakes), 0)::INTEGER,
    COALESCE(SUM(rp.hints_used), 0)::INTEGER,
    AVG(rp.completion_time)::INTEGER
  INTO
    v_player_count,
    v_total_mistakes,
    v_total_hints_used,
    v_average_completion_time
  FROM room_players rp
  WHERE rp.room_id = p_room_id;

  INSERT INTO game_history (
    room_id,
    difficulty,
    player_count,
    winner_id,
    winning_time,
    total_mistakes,
    total_hints_used,
    average_completion_time,
    puzzle,
    solution,
    started_at,
    finished_at
  )
  VALUES (
    p_room_id,
    v_room.difficulty,
    COALESCE(v_player_count, 0),
    p_winner_id,
    p_winning_time,
    COALESCE(v_total_mistakes, 0),
    COALESCE(v_total_hints_used, 0),
    v_average_completion_time,
    v_room.puzzle,
    v_room.solution,
    v_room.started_at,
    NOW()
  );

  FOR v_participant IN
    SELECT player_id, completion_time
    FROM room_players
    WHERE room_id = p_room_id
  LOOP
    PERFORM update_player_stats(
      v_participant.player_id,
      v_participant.player_id = p_winner_id,
      v_room.difficulty,
      v_participant.completion_time
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


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
  v_completion_time INTEGER;
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

    SELECT EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    INTO v_completion_time
    FROM room_players
    WHERE room_id = p_room_id AND player_id = p_player_id;

    UPDATE room_players
    SET
      is_finished = true,
      finish_position = v_finish_position,
      finished_at = NOW(),
      completion_time = v_completion_time
    WHERE room_id = p_room_id AND player_id = p_player_id;

    IF v_finish_position = 1 THEN
      PERFORM finalize_room_with_winner(p_room_id, p_player_id, v_completion_time);
    END IF;

    RETURN jsonb_build_object('success', true, 'completed', true, 'finish_position', v_finish_position);
  END IF;

  RETURN jsonb_build_object('success', true, 'completed', false);
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
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM room_players
    WHERE room_id = p_room_id AND player_id = p_player_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player is not in this room');
  END IF;

  IF v_room.status = 'waiting' THEN
    DELETE FROM room_players
    WHERE room_id = p_room_id AND player_id = p_player_id;

    IF NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id) THEN
      DELETE FROM rooms WHERE id = p_room_id;
      RETURN jsonb_build_object('success', true, 'deleted', true);
    END IF;

    IF v_room.host_id = p_player_id THEN
      SELECT player_id INTO v_next_host
      FROM room_players
      WHERE room_id = p_room_id
      ORDER BY joined_at ASC
      LIMIT 1;

      UPDATE rooms SET host_id = v_next_host WHERE id = p_room_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'left', true);
  END IF;

  IF v_room.status = 'active' THEN
    UPDATE rooms
    SET status = 'cancelled', finished_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'cancelled', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'closed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION finalize_room_with_winner(UUID, UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_player_progress(UUID, UUID, JSONB, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION forfeit_room(UUID, UUID) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'Room lifecycle updated: first finisher wins, active forfeits cancel rooms.';
END $$;
