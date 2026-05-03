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
  SELECT
    r.id,
    r.difficulty,
    COUNT(rp.player_id)::INTEGER,
    p_winner_id,
    p_winning_time,
    COALESCE(SUM(rp.mistakes), 0)::INTEGER,
    COALESCE(SUM(rp.hints_used), 0)::INTEGER,
    AVG(rp.completion_time)::INTEGER,
    r.puzzle,
    r.solution,
    r.started_at,
    NOW()
  FROM rooms r
  LEFT JOIN room_players rp ON rp.room_id = r.id
  WHERE r.id = p_room_id
  GROUP BY r.id
  ON CONFLICT DO NOTHING;

  PERFORM update_player_stats(
    rp.player_id,
    rp.player_id = p_winner_id,
    v_room.difficulty,
    rp.completion_time
  )
  FROM room_players rp
  WHERE rp.room_id = p_room_id;
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
