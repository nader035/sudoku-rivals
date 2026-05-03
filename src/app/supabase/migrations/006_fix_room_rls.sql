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