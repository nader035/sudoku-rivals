-- ============================================================================
-- Sudoku Rival Database Functions
-- ============================================================================
-- Description: PostgreSQL functions for game logic and statistics
-- Author: Nader Mohamed
-- Created: 2026-04-28
-- ============================================================================

-- ============================================================================
-- FUNCTION: update_updated_at_column()
-- ============================================================================
-- Automatically updates the updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to update updated_at timestamp';

-- ============================================================================
-- FUNCTION: get_leaderboard(difficulty, limit)
-- ============================================================================
-- Returns top players by wins for specified difficulty
-- ============================================================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_difficulty TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  player_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_wins INTEGER,
  difficulty_wins INTEGER,
  total_games INTEGER,
  win_rate NUMERIC,
  average_time INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS player_id,
    p.username,
    p.avatar_url,
    p.total_wins,
    CASE p_difficulty
      WHEN 'easy' THEN p.easy_wins
      WHEN 'medium' THEN p.medium_wins
      WHEN 'hard' THEN p.hard_wins
      WHEN 'expert' THEN p.expert_wins
      ELSE p.total_wins
    END AS difficulty_wins,
    p.total_games,
    CASE 
      WHEN p.total_games > 0 THEN ROUND((p.total_wins::NUMERIC / p.total_games::NUMERIC) * 100, 2)
      ELSE 0
    END AS win_rate,
    p.average_time,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE p_difficulty
          WHEN 'easy' THEN p.easy_wins
          WHEN 'medium' THEN p.medium_wins
          WHEN 'hard' THEN p.hard_wins
          WHEN 'expert' THEN p.expert_wins
          ELSE p.total_wins
        END DESC,
        p.average_time ASC
    )::INTEGER AS rank
  FROM players p
  WHERE p.is_active = true AND p.is_banned = false
  ORDER BY rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_leaderboard(TEXT, INTEGER) IS 'Get top players by wins for specified difficulty';

-- ============================================================================
-- FUNCTION: update_player_stats(player_id, won, difficulty, completion_time)
-- ============================================================================
-- Updates player statistics after game completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_stats(
  p_player_id UUID,
  p_won BOOLEAN,
  p_difficulty TEXT,
  p_completion_time INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_total_games INTEGER;
  v_total_time BIGINT;
BEGIN
  -- Update total games
  UPDATE players
  SET total_games = total_games + 1
  WHERE id = p_player_id;
  
  -- Update wins if player won
  IF p_won THEN
    UPDATE players
    SET 
      total_wins = total_wins + 1,
      easy_wins = CASE WHEN p_difficulty = 'easy' THEN easy_wins + 1 ELSE easy_wins END,
      medium_wins = CASE WHEN p_difficulty = 'medium' THEN medium_wins + 1 ELSE medium_wins END,
      hard_wins = CASE WHEN p_difficulty = 'hard' THEN hard_wins + 1 ELSE hard_wins END,
      expert_wins = CASE WHEN p_difficulty = 'expert' THEN expert_wins + 1 ELSE expert_wins END
    WHERE id = p_player_id;
  END IF;
  
  -- Update average time if completion time provided
  IF p_completion_time IS NOT NULL THEN
    SELECT total_games, average_time * total_games
    INTO v_total_games, v_total_time
    FROM players
    WHERE id = p_player_id;
    
    UPDATE players
    SET average_time = ((v_total_time + p_completion_time) / v_total_games)::INTEGER
    WHERE id = p_player_id;
  END IF;
  
  -- Update last seen
  UPDATE players
  SET last_seen_at = NOW()
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_player_stats(UUID, BOOLEAN, TEXT, INTEGER) IS 'Update player statistics after game';

-- ============================================================================
-- FUNCTION: check_room_completion(room_id)
-- ============================================================================
-- Checks if all players finished and updates room status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_room_completion(p_room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_players INTEGER;
  v_finished_players INTEGER;
  v_winner_id UUID;
  v_winning_time INTEGER;
BEGIN
  -- Get player counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_finished = true)
  INTO v_total_players, v_finished_players
  FROM room_players
  WHERE room_id = p_room_id;
  
  -- Check if all players finished
  IF v_finished_players = v_total_players AND v_total_players > 0 THEN
    -- Get winner (first to finish)
    SELECT player_id, completion_time
    INTO v_winner_id, v_winning_time
    FROM room_players
    WHERE room_id = p_room_id AND finish_position = 1;
    
    -- Update room status
    UPDATE rooms
    SET 
      status = 'finished',
      finished_at = NOW(),
      winner_id = v_winner_id,
      winning_time = v_winning_time
    WHERE id = p_room_id;
    
    -- Create game history record
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
      v_total_players,
      v_winner_id,
      v_winning_time,
      SUM(rp.mistakes),
      SUM(rp.hints_used),
      AVG(rp.completion_time)::INTEGER,
      r.puzzle,
      r.solution,
      r.started_at,
      NOW()
    FROM rooms r
    LEFT JOIN room_players rp ON rp.room_id = r.id
    WHERE r.id = p_room_id
    GROUP BY r.id;
    
    -- Update player stats for all participants
    PERFORM update_player_stats(
      rp.player_id,
      rp.finish_position = 1,
      r.difficulty,
      rp.completion_time
    )
    FROM room_players rp
    JOIN rooms r ON r.id = rp.room_id
    WHERE rp.room_id = p_room_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_room_completion(UUID) IS 'Check if all players finished and finalize room';

-- ============================================================================
-- FUNCTION: join_room(room_id, player_id, password)
-- ============================================================================
-- Handles player joining a room with validation
-- ============================================================================

CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_initial_board JSONB;
BEGIN
  -- Get room details
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id;
  
  -- Validate room exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room not found'
    );
  END IF;
  
  -- Validate room status
  IF v_room.status != 'waiting' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room is not accepting players'
    );
  END IF;
  
  -- Validate room capacity
  IF v_room.current_players >= v_room.max_players THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room is full'
    );
  END IF;
  
  -- Validate password for private rooms
  IF v_room.is_private AND v_room.password_hash IS NOT NULL THEN
    IF p_password IS NULL OR crypt(p_password, v_room.password_hash) != v_room.password_hash THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid password'
      );
    END IF;
  END IF;
  
  -- Check if player already in room
  IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND player_id = p_player_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already in room'
    );
  END IF;
  
  -- Add player to room
  INSERT INTO room_players (room_id, player_id, board)
  VALUES (p_room_id, p_player_id, v_room.puzzle);
  
  -- Update room player count
  UPDATE rooms
  SET current_players = current_players + 1
  WHERE id = p_room_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'room_id', p_room_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION join_room(UUID, UUID, TEXT) IS 'Handle player joining room with validation';

-- ============================================================================
-- FUNCTION: start_room(room_id, player_id)
-- ============================================================================
-- Starts a room game (host only)
-- ============================================================================

CREATE OR REPLACE FUNCTION start_room(
  p_room_id UUID,
  p_player_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Get room details
  SELECT * INTO v_room
  FROM rooms
  WHERE id = p_room_id;
  
  -- Validate room exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room not found'
    );
  END IF;
  
  -- Validate player is host
  IF v_room.host_id != p_player_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only host can start the game'
    );
  END IF;
  
  -- Validate room status
  IF v_room.status != 'waiting' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room already started'
    );
  END IF;
  
  -- Validate minimum players
  IF v_room.current_players < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Need at least 2 players to start'
    );
  END IF;
  
  -- Start the room
  UPDATE rooms
  SET 
    status = 'active',
    started_at = NOW()
  WHERE id = p_room_id;
  
  -- Update all room players
  UPDATE room_players
  SET started_at = NOW()
  WHERE room_id = p_room_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'started_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_room(UUID, UUID) IS 'Start room game (host only)';

-- ============================================================================
-- FUNCTION: update_player_progress(room_id, player_id, board, progress, mistakes)
-- ============================================================================
-- Updates player progress in a room
-- ============================================================================

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
  -- Update player progress
  UPDATE room_players
  SET 
    board = p_board,
    progress = p_progress,
    mistakes = p_mistakes,
    last_move_at = NOW()
  WHERE room_id = p_room_id AND player_id = p_player_id;
  
  -- Check if player completed (100% progress)
  IF p_progress >= 100 THEN
    -- Get next finish position
    SELECT COALESCE(MAX(finish_position), 0) + 1
    INTO v_finish_position
    FROM room_players
    WHERE room_id = p_room_id;
    
    -- Mark as finished
    UPDATE room_players
    SET 
      is_finished = true,
      finish_position = v_finish_position,
      finished_at = NOW(),
      completion_time = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE room_id = p_room_id AND player_id = p_player_id;
    
    -- Check if room is complete
    PERFORM check_room_completion(p_room_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'completed', true,
      'finish_position', v_finish_position
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'completed', false
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_player_progress(UUID, UUID, JSONB, INTEGER, INTEGER) IS 'Update player progress in room';

-- ============================================================================
-- FUNCTION: get_recent_matches(player_id, limit)
-- ============================================================================
-- Returns recent matches for a player
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_matches(
  p_player_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  game_id UUID,
  difficulty TEXT,
  player_count INTEGER,
  finish_position INTEGER,
  won BOOLEAN,
  completion_time INTEGER,
  mistakes INTEGER,
  hints_used INTEGER,
  finished_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gh.id AS game_id,
    gh.difficulty,
    gh.player_count,
    rp.finish_position,
    (gh.winner_id = p_player_id) AS won,
    rp.completion_time,
    rp.mistakes,
    rp.hints_used,
    gh.finished_at
  FROM game_history gh
  JOIN room_players rp ON rp.room_id = gh.room_id
  WHERE rp.player_id = p_player_id
  ORDER BY gh.finished_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recent_matches(UUID, INTEGER) IS 'Get recent matches for player';

-- ============================================================================
-- FUNCTION: create_notification(player_id, type, title, message, room_id, sender_id)
-- ============================================================================
-- Creates a notification for a player
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_player_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_room_id UUID DEFAULT NULL,
  p_sender_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (player_id, type, title, message, room_id, sender_id)
  VALUES (p_player_id, p_type, p_title, p_message, p_room_id, p_sender_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID) IS 'Create notification for player';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Functions created successfully!';
  RAISE NOTICE 'Next step: Run 003_create_triggers.sql';
END $$;

-- Made with Bob
