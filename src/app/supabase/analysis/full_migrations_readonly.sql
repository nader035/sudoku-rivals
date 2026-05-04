-- ============================================================================
-- Sudoku Rival Supabase Migrations (READ-ONLY ANALYSIS BUNDLE)
-- Generated from src/app/supabase/migrations in filename order.
-- Do NOT run this file as a migration.
-- Apply real migrations individually in order instead.
-- ============================================================================



-- ============================================================================
-- BEGIN: 001_create_tables.sql
-- ============================================================================

-- ============================================================================
-- Sudoku Rival Database Schema
-- ============================================================================
-- Description: Core database tables for multiplayer Sudoku game
-- Author: Nader Mohamed
-- Created: 2026-04-28
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
-- Stores user profiles and statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS players (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Authentication (Supabase Auth integration)
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile information
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  avatar_url TEXT,
  display_name TEXT,
  
  -- Statistics
  total_wins INTEGER DEFAULT 0 CHECK (total_wins >= 0),
  total_games INTEGER DEFAULT 0 CHECK (total_games >= 0),
  total_mistakes INTEGER DEFAULT 0 CHECK (total_mistakes >= 0),
  average_time INTEGER DEFAULT 0 CHECK (average_time >= 0), -- in seconds
  
  -- Difficulty-specific stats
  easy_wins INTEGER DEFAULT 0 CHECK (easy_wins >= 0),
  medium_wins INTEGER DEFAULT 0 CHECK (medium_wins >= 0),
  hard_wins INTEGER DEFAULT 0 CHECK (hard_wins >= 0),
  expert_wins INTEGER DEFAULT 0 CHECK (expert_wins >= 0),
  
  -- User preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  sound_enabled BOOLEAN DEFAULT true,
  animations_enabled BOOLEAN DEFAULT true,
  
  -- Role-based access control
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'moderator', 'admin')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_auth_id ON players(auth_id);
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_total_wins ON players(total_wins DESC);
CREATE INDEX idx_players_role ON players(role);
CREATE INDEX idx_players_created_at ON players(created_at DESC);

-- Comments
COMMENT ON TABLE players IS 'User profiles and game statistics';
COMMENT ON COLUMN players.auth_id IS 'Reference to Supabase auth.users';
COMMENT ON COLUMN players.average_time IS 'Average game completion time in seconds';

-- ============================================================================
-- ROOMS TABLE
-- ============================================================================
-- Stores multiplayer game rooms
-- ============================================================================

CREATE TABLE IF NOT EXISTS rooms (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Room configuration
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  
  -- Player limits
  max_players INTEGER DEFAULT 4 CHECK (max_players BETWEEN 2 AND 6),
  current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
  
  -- Room status
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  
  -- Access control
  is_private BOOLEAN DEFAULT false,
  password_hash TEXT, -- bcrypt hash if private
  
  -- Host information
  host_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  
  -- Puzzle data (JSONB for flexibility)
  puzzle JSONB NOT NULL, -- 9x9 array with 0 for empty cells
  solution JSONB NOT NULL, -- 9x9 array with complete solution
  initial_board JSONB NOT NULL, -- Original puzzle state for validation
  
  -- Game settings
  allow_hints BOOLEAN DEFAULT true,
  allow_mistakes BOOLEAN DEFAULT true,
  max_mistakes INTEGER DEFAULT 5 CHECK (max_mistakes > 0),
  freeze_duration INTEGER DEFAULT 3 CHECK (freeze_duration > 0), -- seconds
  mega_freeze_duration INTEGER DEFAULT 10 CHECK (mega_freeze_duration > 0), -- seconds
  
  -- Winner information
  winner_id UUID REFERENCES players(id),
  winning_time INTEGER, -- seconds to complete
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_player_count CHECK (current_players <= max_players),
  CONSTRAINT valid_status_transition CHECK (
    (status = 'waiting' AND started_at IS NULL) OR
    (status = 'active' AND started_at IS NOT NULL) OR
    (status = 'finished' AND finished_at IS NOT NULL) OR
    (status = 'cancelled')
  )
);

-- Indexes for performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_difficulty ON rooms(difficulty);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX idx_rooms_is_private ON rooms(is_private);
CREATE INDEX idx_rooms_active_waiting ON rooms(status) WHERE status IN ('waiting', 'active');

-- Comments
COMMENT ON TABLE rooms IS 'Multiplayer game rooms';
COMMENT ON COLUMN rooms.puzzle IS '9x9 Sudoku puzzle with 0 for empty cells';
COMMENT ON COLUMN rooms.solution IS 'Complete solution for validation';
COMMENT ON COLUMN rooms.password_hash IS 'Bcrypt hash for private rooms';

-- ============================================================================
-- ROOM_PLAYERS TABLE
-- ============================================================================
-- Junction table for room participants with game progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_players (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign keys
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  
  -- Game progress
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  mistakes INTEGER DEFAULT 0 CHECK (mistakes >= 0),
  hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
  
  -- Current board state (JSONB for flexibility)
  board JSONB NOT NULL, -- Player's current puzzle state
  
  -- Penalty tracking
  frozen_until TIMESTAMPTZ,
  mega_freeze_count INTEGER DEFAULT 0 CHECK (mega_freeze_count >= 0),
  
  -- Completion tracking
  is_finished BOOLEAN DEFAULT false,
  finish_position INTEGER, -- 1st, 2nd, 3rd, etc.
  completion_time INTEGER, -- seconds from start to finish
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_move_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(room_id, player_id),
  CONSTRAINT valid_progress CHECK (
    (is_finished = false AND progress < 100) OR
    (is_finished = true AND progress = 100)
  )
);

-- Indexes for performance
CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_room_players_player_id ON room_players(player_id);
CREATE INDEX idx_room_players_progress ON room_players(progress DESC);
CREATE INDEX idx_room_players_is_finished ON room_players(is_finished);
CREATE INDEX idx_room_players_finish_position ON room_players(finish_position);

-- Partial unique index for finish_position (only when not NULL)
CREATE UNIQUE INDEX idx_room_players_unique_finish_position
  ON room_players(room_id, finish_position)
  WHERE finish_position IS NOT NULL;

-- Comments
COMMENT ON TABLE room_players IS 'Player participation and progress in rooms';
COMMENT ON COLUMN room_players.board IS 'Player current puzzle state (9x9 array)';
COMMENT ON COLUMN room_players.frozen_until IS 'Timestamp when penalty freeze expires';
COMMENT ON COLUMN room_players.finish_position IS 'Ranking position (1st, 2nd, 3rd, etc.)';

-- ============================================================================
-- GAME_HISTORY TABLE
-- ============================================================================
-- Stores completed game records for statistics and replay
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Room reference
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Game metadata
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  player_count INTEGER NOT NULL CHECK (player_count BETWEEN 1 AND 6),
  
  -- Winner information
  winner_id UUID REFERENCES players(id),
  winning_time INTEGER, -- seconds
  
  -- Game statistics
  total_mistakes INTEGER DEFAULT 0,
  total_hints_used INTEGER DEFAULT 0,
  average_completion_time INTEGER,
  
  -- Puzzle data (for replay)
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (finished_at > started_at)
);

-- Indexes for performance
CREATE INDEX idx_game_history_winner_id ON game_history(winner_id);
CREATE INDEX idx_game_history_difficulty ON game_history(difficulty);
CREATE INDEX idx_game_history_finished_at ON game_history(finished_at DESC);
CREATE INDEX idx_game_history_room_id ON game_history(room_id);

-- Comments
COMMENT ON TABLE game_history IS 'Completed game records for statistics';

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Stores user notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('game_invite', 'game_start', 'game_finish', 'achievement', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES players(id) ON DELETE SET NULL,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_notifications_player_id ON notifications(player_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(player_id, is_read) WHERE is_read = false;

-- Comments
COMMENT ON TABLE notifications IS 'User notifications for game events';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tables created successfully!';
  RAISE NOTICE 'Next step: Run 002_create_functions.sql';
END $$;

-- Made with Bob

-- ============================================================================
-- END: 001_create_tables.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 002_create_functions.sql
-- ============================================================================

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

-- ============================================================================
-- END: 002_create_functions.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 003_create_triggers.sql
-- ============================================================================

-- ============================================================================
-- Sudoku Rival Database Triggers
-- ============================================================================
-- Description: Automatic triggers for data consistency and updates
-- Author: Nader Mohamed
-- Created: 2026-04-28
-- ============================================================================

-- ============================================================================
-- TRIGGER: update_players_updated_at
-- ============================================================================
-- Automatically updates players.updated_at on row update
-- ============================================================================

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_players_updated_at ON players IS 'Auto-update updated_at timestamp';

-- ============================================================================
-- TRIGGER: notify_room_player_joined
-- ============================================================================
-- Sends notification when player joins a room
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_room_player_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_room_name TEXT;
  v_player_username TEXT;
BEGIN
  -- Get room and player details
  SELECT name INTO v_room_name FROM rooms WHERE id = NEW.room_id;
  SELECT username INTO v_player_username FROM players WHERE id = NEW.player_id;
  
  -- Notify all other players in the room
  INSERT INTO notifications (player_id, type, title, message, room_id, sender_id)
  SELECT 
    rp.player_id,
    'game_invite',
    'Player Joined',
    v_player_username || ' joined ' || v_room_name,
    NEW.room_id,
    NEW.player_id
  FROM room_players rp
  WHERE rp.room_id = NEW.room_id 
    AND rp.player_id != NEW.player_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_room_player_joined
  AFTER INSERT ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION notify_room_player_joined();

COMMENT ON TRIGGER notify_room_player_joined ON room_players IS 'Notify players when someone joins room';

-- ============================================================================
-- TRIGGER: notify_room_started
-- ============================================================================
-- Sends notification when room game starts
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_room_started()
RETURNS TRIGGER AS $$
DECLARE
  v_room_name TEXT;
BEGIN
  -- Only trigger when status changes to 'active'
  IF OLD.status = 'waiting' AND NEW.status = 'active' THEN
    SELECT name INTO v_room_name FROM rooms WHERE id = NEW.id;
    
    -- Notify all players in the room
    INSERT INTO notifications (player_id, type, title, message, room_id)
    SELECT 
      rp.player_id,
      'game_start',
      'Game Started!',
      'The game in ' || v_room_name || ' has started. Good luck!',
      NEW.id
    FROM room_players rp
    WHERE rp.room_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_room_started
  AFTER UPDATE ON rooms
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_room_started();

COMMENT ON TRIGGER notify_room_started ON rooms IS 'Notify players when game starts';

-- ============================================================================
-- TRIGGER: notify_room_finished
-- ============================================================================
-- Sends notification when room game finishes
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_room_finished()
RETURNS TRIGGER AS $$
DECLARE
  v_room_name TEXT;
  v_winner_username TEXT;
BEGIN
  -- Only trigger when status changes to 'finished'
  IF OLD.status = 'active' AND NEW.status = 'finished' THEN
    SELECT name INTO v_room_name FROM rooms WHERE id = NEW.id;
    SELECT username INTO v_winner_username FROM players WHERE id = NEW.winner_id;
    
    -- Notify all players in the room
    INSERT INTO notifications (player_id, type, title, message, room_id)
    SELECT 
      rp.player_id,
      'game_finish',
      'Game Finished!',
      CASE 
        WHEN rp.player_id = NEW.winner_id THEN 'Congratulations! You won ' || v_room_name || '!'
        ELSE v_winner_username || ' won ' || v_room_name || '. Better luck next time!'
      END,
      NEW.id
    FROM room_players rp
    WHERE rp.room_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_room_finished
  AFTER UPDATE ON rooms
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_room_finished();

COMMENT ON TRIGGER notify_room_finished ON rooms IS 'Notify players when game finishes';

-- ============================================================================
-- TRIGGER: update_room_player_count_on_insert
-- ============================================================================
-- Automatically updates room.current_players when player joins
-- ============================================================================

CREATE OR REPLACE FUNCTION update_room_player_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms
  SET current_players = current_players + 1
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_player_count_on_insert
  AFTER INSERT ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_player_count_on_insert();

COMMENT ON TRIGGER update_room_player_count_on_insert ON room_players IS 'Increment room player count on join';

-- ============================================================================
-- TRIGGER: update_room_player_count_on_delete
-- ============================================================================
-- Automatically updates room.current_players when player leaves
-- ============================================================================

CREATE OR REPLACE FUNCTION update_room_player_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms
  SET current_players = GREATEST(0, current_players - 1)
  WHERE id = OLD.room_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_player_count_on_delete
  AFTER DELETE ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_player_count_on_delete();

COMMENT ON TRIGGER update_room_player_count_on_delete ON room_players IS 'Decrement room player count on leave';

-- ============================================================================
-- TRIGGER: check_room_completion_on_finish
-- ============================================================================
-- Automatically checks if room is complete when player finishes
-- ============================================================================

CREATE OR REPLACE FUNCTION check_room_completion_on_finish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when player finishes
  IF OLD.is_finished = false AND NEW.is_finished = true THEN
    PERFORM check_room_completion(NEW.room_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_room_completion_on_finish
  AFTER UPDATE ON room_players
  FOR EACH ROW
  WHEN (OLD.is_finished IS DISTINCT FROM NEW.is_finished)
  EXECUTE FUNCTION check_room_completion_on_finish();

COMMENT ON TRIGGER check_room_completion_on_finish ON room_players IS 'Check room completion when player finishes';

-- ============================================================================
-- TRIGGER: prevent_room_modification_after_start
-- ============================================================================
-- Prevents modifying room settings after game starts
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_room_modification_after_start()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('active', 'finished') THEN
    -- Allow only status and winner updates
    IF NEW.difficulty IS DISTINCT FROM OLD.difficulty OR
       NEW.max_players IS DISTINCT FROM OLD.max_players OR
       NEW.puzzle IS DISTINCT FROM OLD.puzzle OR
       NEW.solution IS DISTINCT FROM OLD.solution THEN
      RAISE EXCEPTION 'Cannot modify room settings after game starts';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_room_modification_after_start
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION prevent_room_modification_after_start();

COMMENT ON TRIGGER prevent_room_modification_after_start ON rooms IS 'Prevent room modification after start';

-- ============================================================================
-- TRIGGER: validate_player_progress
-- ============================================================================
-- Validates player progress updates
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_player_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure progress is between 0 and 100
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'Progress must be between 0 and 100';
  END IF;
  
  -- Ensure mistakes don't decrease
  IF NEW.mistakes < OLD.mistakes THEN
    RAISE EXCEPTION 'Mistakes cannot decrease';
  END IF;
  
  -- Ensure progress doesn't decrease (except on reset)
  IF NEW.progress < OLD.progress AND NEW.progress != 0 THEN
    RAISE EXCEPTION 'Progress cannot decrease';
  END IF;
  
  -- Auto-finish if progress reaches 100
  IF NEW.progress = 100 AND OLD.progress < 100 THEN
    NEW.is_finished = true;
    NEW.finished_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_player_progress
  BEFORE UPDATE ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION validate_player_progress();

COMMENT ON TRIGGER validate_player_progress ON room_players IS 'Validate player progress updates';

-- ============================================================================
-- FUNCTION: handle_new_user (for Supabase Auth Webhook)
-- ============================================================================
-- Creates player record when user signs up
-- Note: This should be called from a Supabase Auth webhook or from your app
-- We cannot create triggers on auth.users table (permission denied)
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (auth_id, username, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || substr(NEW.id::text, 1, 8)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Create player record on user signup (call from app or webhook)';

-- Note: To enable automatic player creation, you have two options:
--
-- Option 1: Call this function from your Angular app after successful signup:
--   await supabase.rpc('handle_new_user')
--
-- Option 2: Set up a Supabase Auth webhook (recommended):
--   1. Go to Supabase Dashboard > Authentication > Hooks
--   2. Enable "user.created" hook
--   3. Point it to a serverless function that calls this function
--
-- Option 3: Handle in application code (AuthService):
--   After signup, manually insert into players table

-- ============================================================================
-- TRIGGER: mark_notification_read
-- ============================================================================
-- Automatically sets read_at timestamp when notification is marked as read
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = false AND NEW.is_read = true THEN
    NEW.read_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_notification_read
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
  EXECUTE FUNCTION mark_notification_read();

COMMENT ON TRIGGER mark_notification_read ON notifications IS 'Set read_at when notification marked as read';

-- ============================================================================
-- TRIGGER: cleanup_old_notifications
-- ============================================================================
-- Periodically cleans up old read notifications (30 days)
-- Note: This would typically be run as a scheduled job, not a trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true 
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications() IS 'Clean up notifications older than 30 days';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Triggers created successfully!';
  RAISE NOTICE 'Next step: Run 004_enable_realtime.sql';
END $$;

-- Made with Bob

-- ============================================================================
-- END: 003_create_triggers.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 004_enable_realtime.sql
-- ============================================================================

-- ============================================================================
-- Sudoku Rival Realtime & Security Configuration
-- ============================================================================
-- Description: Enable Realtime subscriptions and Row Level Security policies
-- Author: Nader Mohamed
-- Created: 2026-04-28
-- ============================================================================

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
-- Enable Realtime for tables that need live updates
-- ============================================================================

-- Enable Realtime for rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Enable Realtime for room_players table
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime for players table (for leaderboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Secure data access with fine-grained permissions
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PLAYERS TABLE POLICIES
-- ============================================================================

-- Allow users to read all active players (for leaderboard)
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (is_active = true AND is_banned = false);

-- Allow users to read their own full profile
CREATE POLICY "Users can view own profile"
  ON players FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON players FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Allow authenticated users to insert their profile
CREATE POLICY "Users can insert own profile"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Allow admins to manage all players
CREATE POLICY "Admins can manage all players"
  ON players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- ROOMS TABLE POLICIES
-- ============================================================================

-- Allow everyone to view waiting and active rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (
    status IN ('waiting', 'active') OR
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_id = rooms.id AND player_id IN (
        SELECT id FROM players WHERE auth_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to create rooms
CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    host_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow room host to update room
CREATE POLICY "Room host can update room"
  ON rooms FOR UPDATE
  USING (
    host_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    host_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow room host to delete room (only if waiting)
CREATE POLICY "Room host can delete waiting room"
  ON rooms FOR DELETE
  USING (
    host_id IN (SELECT id FROM players WHERE auth_id = auth.uid()) AND
    status = 'waiting'
  );

-- ============================================================================
-- ROOM_PLAYERS TABLE POLICIES
-- ============================================================================

-- Allow players to view room_players in their rooms
CREATE POLICY "Players can view room participants"
  ON room_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = room_players.room_id
        AND rp.player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
    )
  );

-- Allow players to join rooms
CREATE POLICY "Players can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow players to update their own progress
CREATE POLICY "Players can update own progress"
  ON room_players FOR UPDATE
  USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow players to leave rooms (only if not started)
CREATE POLICY "Players can leave waiting rooms"
  ON room_players FOR DELETE
  USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM rooms
      WHERE id = room_players.room_id AND status = 'waiting'
    )
  );

-- ============================================================================
-- GAME_HISTORY TABLE POLICIES
-- ============================================================================

-- Allow everyone to view game history
CREATE POLICY "Game history is viewable by everyone"
  ON game_history FOR SELECT
  USING (true);

-- Only system can insert game history (via triggers)
CREATE POLICY "Only system can insert game history"
  ON game_history FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Allow users to view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (
    player_id IN (SELECT id FROM players WHERE auth_id = auth.uid())
  );

-- Allow system to create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin';

-- Function to check if user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players
    WHERE auth_id = auth.uid() AND role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_moderator() IS 'Check if current user is moderator or admin';

-- Function to get current player ID
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM players WHERE auth_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_player_id() IS 'Get current authenticated player ID';

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Index for auth_id lookups (critical for RLS)
CREATE INDEX IF NOT EXISTS idx_players_auth_id_role ON players(auth_id, role);

-- Index for room_players lookups
CREATE INDEX IF NOT EXISTS idx_room_players_player_room ON room_players(player_id, room_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON players TO authenticated;
GRANT SELECT ON players TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;
GRANT SELECT ON rooms TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON room_players TO authenticated;
GRANT SELECT ON room_players TO anon;

GRANT SELECT ON game_history TO authenticated;
GRANT SELECT ON game_history TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_recent_matches(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_room(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_progress(UUID, UUID, JSONB, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated;

-- ============================================================================
-- REALTIME FILTERS (Optional - for better performance)
-- ============================================================================

-- Create a function to filter realtime events
CREATE OR REPLACE FUNCTION realtime_filter_rooms()
RETURNS TRIGGER AS $$
BEGIN
  -- Only broadcast public rooms or rooms user is in
  IF NEW.is_private = false OR 
     EXISTS (
       SELECT 1 FROM room_players
       WHERE room_id = NEW.id AND player_id = current_player_id()
     ) THEN
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Realtime and RLS configured successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update your Angular environment files with Supabase credentials';
  RAISE NOTICE '2. Test the connection from your Angular app';
  RAISE NOTICE '3. Create your first room and start playing!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: players, rooms, room_players, game_history, notifications';
  RAISE NOTICE 'Functions created: 10+ helper functions for game logic';
  RAISE NOTICE 'Triggers created: 12+ automatic triggers for data consistency';
  RAISE NOTICE 'RLS Policies: Secure access control enabled';
  RAISE NOTICE 'Realtime: Enabled for live multiplayer updates';
END $$;

-- Made with Bob

-- ============================================================================
-- END: 004_enable_realtime.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 005_fix_player_rls.sql
-- ============================================================================

-- ============================================================================
-- Fix recursive players RLS policy
-- ============================================================================
-- The original admin policy queried the players table directly, which caused
-- infinite recursion when the API read from players under row-level security.
-- This replacement uses the SECURITY DEFINER helper instead.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all players" ON players;

CREATE POLICY "Admins can manage all players"
  ON players FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- END: 005_fix_player_rls.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 006_fix_room_rls.sql
-- ============================================================================

-- ============================================================================
-- Fix recursive rooms and room_players RLS policies
-- ============================================================================
-- The lobby and room endpoints recurse through policies that query rooms and
-- room_players directly. These SECURITY DEFINER helpers let the policies test
-- membership and ownership without re-entering RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM room_players
    WHERE room_id = p_room_id
      AND player_id = current_player_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_room_host(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rooms
    WHERE id = p_room_id
      AND host_id = current_player_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_room_waiting(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rooms
    WHERE id = p_room_id
      AND status = 'waiting'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Room host can update room" ON rooms;
DROP POLICY IF EXISTS "Room host can delete waiting room" ON rooms;

CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (
    status IN ('waiting', 'active') OR
    is_room_member(id) OR
    is_room_host(id) OR
    is_admin()
  );

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (
    current_player_id() IS NOT NULL AND
    host_id = current_player_id()
  );

CREATE POLICY "Room host can update room"
  ON rooms FOR UPDATE
  USING (is_room_host(id))
  WITH CHECK (is_room_host(id));

CREATE POLICY "Room host can delete waiting room"
  ON rooms FOR DELETE
  USING (is_room_host(id) AND status = 'waiting');

DROP POLICY IF EXISTS "Players can view room participants" ON room_players;
DROP POLICY IF EXISTS "Players can join rooms" ON room_players;
DROP POLICY IF EXISTS "Players can update own progress" ON room_players;
DROP POLICY IF EXISTS "Players can leave waiting rooms" ON room_players;

CREATE POLICY "Players can view room participants"
  ON room_players FOR SELECT
  USING (
    is_room_member(room_id) OR
    is_room_host(room_id) OR
    is_admin()
  );

CREATE POLICY "Players can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (
    player_id = current_player_id() OR
    is_admin()
  );

CREATE POLICY "Players can update own progress"
  ON room_players FOR UPDATE
  USING (
    player_id = current_player_id() OR
    is_admin()
  )
  WITH CHECK (
    player_id = current_player_id() OR
    is_admin()
  );

CREATE POLICY "Players can leave waiting rooms"
  ON room_players FOR DELETE
  USING (
    player_id = current_player_id() AND
    is_room_waiting(room_id)
  );

GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_moderator() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_room_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_room_host(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_room_waiting(UUID) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE '✅ Room and room_players RLS policies fixed successfully!';
  RAISE NOTICE 'Apply this migration after 004_enable_realtime.sql and 005_fix_player_rls.sql';
END $$;

-- ============================================================================
-- END: 006_fix_room_rls.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 007_create_room_rpc.sql
-- ============================================================================

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

-- ============================================================================
-- END: 007_create_room_rpc.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 008_fix_realtime_visibility.sql
-- ============================================================================

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

-- ============================================================================
-- END: 008_fix_realtime_visibility.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 009_fix_player_count_double_counting.sql
-- ============================================================================

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

-- ============================================================================
-- END: 009_fix_player_count_double_counting.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 010_fix_start_room_rpc.sql
-- ============================================================================

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

-- ============================================================================
-- END: 010_fix_start_room_rpc.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 011_finish_and_forfeit_room_lifecycle.sql
-- ============================================================================

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

-- ============================================================================
-- END: 011_finish_and_forfeit_room_lifecycle.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 012_admin_dashboard_actions.sql
-- ============================================================================

-- ============================================================================
-- Admin dashboard actions
-- ============================================================================
-- Explicit RPCs for destructive admin actions used by the Angular dashboard.
-- Each function checks is_admin() before touching data.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_delete_room(p_room_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  DELETE FROM rooms
  WHERE id = p_room_id;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION admin_set_player_ban(
  p_player_id UUID,
  p_banned BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE players
  SET
    is_banned = p_banned,
    is_active = NOT p_banned,
    ban_reason = CASE WHEN p_banned THEN COALESCE(p_reason, 'Admin action') ELSE NULL END,
    banned_until = NULL,
    updated_at = NOW()
  WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'banned', p_banned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_delete_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_player_ban(UUID, BOOLEAN, TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Admin dashboard actions installed.';
END $$;

-- ============================================================================
-- END: 012_admin_dashboard_actions.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 013_fix_room_creation_difficulty_and_password.sql
-- ============================================================================

-- ============================================================================
-- Fix room creation: difficulty normalization + private password hashing
-- ============================================================================
-- Why:
-- 1) Some clients can submit stale form defaults (difficulty drift).
-- 2) Client-side bcrypt hashes may be incompatible with pgcrypto crypt() checks.
--
-- This migration makes `create_room` normalize difficulty server-side and
-- hash private room passwords inside Postgres with pgcrypto.
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

    -- Keep the parameter name for backwards compatibility; value is plain text.
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

CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_input_password TEXT;
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
    IF v_input_password IS NULL OR crypt(v_input_password, v_room.password_hash) != v_room.password_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
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

GRANT EXECUTE ON FUNCTION join_room(UUID, UUID, TEXT) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'Room creation updated: difficulty normalized, private password hashed in DB.';
  RAISE NOTICE 'Room join updated: password verification uses normalized input.';
END $$;

-- ============================================================================
-- END: 013_fix_room_creation_difficulty_and_password.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 014_fix_gen_salt_signature.sql
-- ============================================================================

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

-- ============================================================================
-- END: 014_fix_gen_salt_signature.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 015_fix_pgcrypto_search_path.sql
-- ============================================================================

-- ============================================================================
-- Hotfix: pgcrypto search path compatibility for room auth flows
-- ============================================================================
-- Fixes runtime errors like:
--   function gen_salt(unknown) does not exist
-- by ensuring SECURITY DEFINER functions can resolve pgcrypto functions in
-- Supabase projects where extensions are installed under `extensions` schema.
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

CREATE OR REPLACE FUNCTION join_room(
  p_room_id UUID,
  p_player_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_room RECORD;
  v_input_password TEXT;
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
    IF v_input_password IS NULL OR crypt(v_input_password, v_room.password_hash) != v_room.password_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
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
  RAISE NOTICE 'pgcrypto search-path hotfix applied to create_room/join_room.';
END $$;

-- ============================================================================
-- END: 015_fix_pgcrypto_search_path.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 016_room_password_hash_fallback.sql
-- ============================================================================

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

-- ============================================================================
-- END: 016_room_password_hash_fallback.sql
-- ============================================================================


-- ============================================================================
-- BEGIN: 017_fix_progress_decrease_rules.sql
-- ============================================================================

-- ============================================================================
-- Fix multiplayer progress validation for penalties and board resets
-- ============================================================================
-- Why:
-- - Match rules now allow board reset at 10 mistakes.
-- - Players can also clear/rework cells, which can reduce computed progress.
-- - Previous trigger raised: "Progress cannot decrease".
--
-- This migration keeps bounds checks but allows valid progress decreases.
-- Mistakes may only decrease on a full reset to 0/0.
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_player_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep hard bounds for server safety.
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'Progress must be between 0 and 100';
  END IF;

  IF NEW.mistakes < 0 THEN
    RAISE EXCEPTION 'Mistakes must be zero or greater';
  END IF;

  -- Allow mistakes to decrease only on a full board reset state.
  IF NEW.mistakes < OLD.mistakes THEN
    IF NOT (NEW.mistakes = 0 AND NEW.progress = 0) THEN
      RAISE EXCEPTION 'Mistakes cannot decrease unless progress resets to 0';
    END IF;
  END IF;

  -- Progress may decrease due to penalties, board clears, or reset rules.
  -- We intentionally do not block decreases anymore.

  -- Auto-finish when progress first reaches 100.
  IF NEW.progress = 100 AND OLD.progress < 100 THEN
    NEW.is_finished = true;
    NEW.finished_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Progress validation updated: decreases allowed for penalty/reset flow.';
END $$;

-- ============================================================================
-- END: 017_fix_progress_decrease_rules.sql
-- ============================================================================

