-- ============================================================================
-- Fix: startRoom can't update all room_players due to RLS
-- ============================================================================
-- The host calls startRoom which tries to UPDATE all room_players rows
-- with the generated puzzle. But RLS policy "Players can update own progress"
-- only allows updating YOUR OWN row (player_id = current_player_id()).
-- Result: only the host gets the puzzle board, other players get nothing.
--
-- Fix: Create a SECURITY DEFINER RPC that updates all players' boards.
-- ============================================================================

CREATE OR REPLACE FUNCTION start_room_with_puzzle(
  p_room_id UUID,
  p_puzzle JSONB,
  p_solution JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_host_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_host_id := current_player_id();

  IF v_host_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room.host_id != v_host_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only host can start the game');
  END IF;

  IF v_room.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room already started');
  END IF;

  IF v_room.current_players < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players to start');
  END IF;

  -- Update room with puzzle and status
  UPDATE rooms
  SET
    status = 'active',
    puzzle = p_puzzle,
    solution = p_solution,
    initial_board = p_puzzle,
    started_at = v_now
  WHERE id = p_room_id;

  -- Update ALL room_players boards (SECURITY DEFINER bypasses RLS)
  UPDATE room_players
  SET
    board = p_puzzle,
    progress = 0,
    mistakes = 0,
    hints_used = 0,
    frozen_until = NULL,
    mega_freeze_count = 0,
    is_finished = false,
    finish_position = NULL,
    completion_time = NULL,
    started_at = v_now,
    finished_at = NULL,
    last_move_at = v_now
  WHERE room_id = p_room_id;

  RETURN jsonb_build_object('success', true, 'started_at', v_now);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION start_room_with_puzzle(UUID, JSONB, JSONB) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 applied!';
  RAISE NOTICE 'Fixed: start_room_with_puzzle RPC updates ALL players boards via SECURITY DEFINER';
END $$;
