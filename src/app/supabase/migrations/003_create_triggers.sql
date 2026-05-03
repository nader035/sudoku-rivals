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
