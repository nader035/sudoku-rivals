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
