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
