-- ============================================================================
-- Broadcast delivery: target all auth users (not only existing players rows)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_sender_player_id UUID;
  v_target_auth_id UUID;
  v_target_player_id UUID;
  v_sent_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Broadcast title must be at least 3 characters';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) < 5 THEN
    RAISE EXCEPTION 'Broadcast message must be at least 5 characters';
  END IF;

  v_sender_player_id := ensure_player_row_for_auth(v_user_id);

  FOR v_target_auth_id IN
    SELECT u.id
    FROM auth.users u
    LEFT JOIN profiles pr ON pr.id = u.id
    WHERE COALESCE(pr.is_banned, false) = false
  LOOP
    v_target_player_id := ensure_player_row_for_auth(v_target_auth_id);

    INSERT INTO notifications (player_id, type, title, message, sender_id)
    VALUES (v_target_player_id, 'system', trim(p_title), trim(p_message), v_sender_player_id);

    v_sent_count := v_sent_count + 1;
  END LOOP;

  PERFORM log_admin_action(
    'admin_broadcast_notification',
    'notification',
    NULL,
    NULL,
    jsonb_build_object(
      'title', trim(p_title),
      'message', trim(p_message),
      'sent_count', v_sent_count
    ),
    NULLIF(trim(COALESCE(p_reason, '')), '')
  );

  RETURN v_sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_broadcast_notification(TEXT, TEXT, TEXT) TO authenticated;

