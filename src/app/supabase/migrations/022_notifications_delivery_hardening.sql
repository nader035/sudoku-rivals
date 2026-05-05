-- ============================================================================
-- Notifications delivery hardening
-- - Ensures each auth user can have a players row
-- - Uses secure RPCs for reading/marking notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_player_row_for_auth(p_auth_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_username TEXT;
  v_email TEXT;
BEGIN
  IF p_auth_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_player_id
  FROM players
  WHERE auth_id = p_auth_id
  LIMIT 1;

  IF v_player_id IS NOT NULL THEN
    RETURN v_player_id;
  END IF;

  SELECT COALESCE(pr.username, split_part(au.email, '@', 1), 'Player')
  INTO v_username
  FROM auth.users au
  LEFT JOIN profiles pr ON pr.id = au.id
  WHERE au.id = p_auth_id;

  SELECT au.email INTO v_email
  FROM auth.users au
  WHERE au.id = p_auth_id;

  v_username := left(regexp_replace(COALESCE(v_username, 'Player'), '[^a-zA-Z0-9_]+', '', 'g'), 18);
  IF v_username IS NULL OR length(v_username) < 3 THEN
    v_username := 'Player';
  END IF;

  BEGIN
    INSERT INTO players (auth_id, username, email, role, last_seen_at)
    VALUES (p_auth_id, v_username, v_email, 'player', NOW())
    RETURNING id INTO v_player_id;
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO players (auth_id, username, email, role, last_seen_at)
      VALUES (
        p_auth_id,
        left(v_username, 12) || '_' || right(replace(p_auth_id::TEXT, '-', ''), 6),
        v_email,
        'player',
        NOW()
      )
      ON CONFLICT (auth_id) DO UPDATE
      SET last_seen_at = NOW()
      RETURNING id INTO v_player_id;
  END;

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_notifications(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  player_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  room_id UUID,
  sender_id UUID,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := ensure_player_row_for_auth(auth.uid());

  RETURN QUERY
  SELECT
    n.id,
    n.player_id,
    n.type,
    n.title,
    n.message,
    n.room_id,
    n.sender_id,
    n.is_read,
    n.created_at,
    n.read_at
  FROM notifications n
  WHERE n.player_id = v_player_id
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_notification_read_secure(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_player_id UUID;
  v_rows INTEGER := 0;
BEGIN
  v_player_id := ensure_player_row_for_auth(auth.uid());

  UPDATE notifications
  SET
    is_read = true,
    read_at = NOW()
  WHERE id = p_notification_id
    AND player_id = v_player_id
    AND is_read = false;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_all_notifications_read_secure()
RETURNS INTEGER AS $$
DECLARE
  v_player_id UUID;
  v_rows INTEGER := 0;
BEGIN
  v_player_id := ensure_player_row_for_auth(auth.uid());

  UPDATE notifications
  SET
    is_read = true,
    read_at = NOW()
  WHERE player_id = v_player_id
    AND is_read = false;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_player_row_for_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read_secure() TO authenticated;

