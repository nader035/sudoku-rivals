-- ============================================================================
-- Owner role with full permissions + broadcast delivery adjustments
-- ============================================================================

DO $$
BEGIN
  BEGIN
    ALTER TYPE admin_role_type ADD VALUE IF NOT EXISTS 'owner';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('owner', 'super_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_admin_role(p_user_id UUID, p_required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role = 'owner') THEN
    RETURN TRUE;
  END IF;

  IF p_required_role = 'owner' THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role = 'super_admin') THEN
    RETURN TRUE;
  END IF;

  IF p_required_role = 'super_admin' THEN
    RETURN FALSE;
  END IF;

  IF p_required_role = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role = 'admin')
      OR EXISTS (SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin');
  END IF;

  IF p_required_role = 'finance' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role IN ('finance', 'admin')
    ) OR EXISTS (
      SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
    );
  END IF;

  IF p_required_role = 'support' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = p_user_id AND ur.role IN ('support', 'admin', 'finance')
    ) OR EXISTS (
      SELECT 1 FROM players p WHERE p.auth_id = p_user_id AND p.role = 'admin'
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_admin_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF has_admin_role(p_user_id, 'owner') THEN
    RETURN TRUE;
  END IF;

  IF p_permission IN ('approve_purchase', 'reject_purchase') THEN
    RETURN has_admin_role(p_user_id, 'finance') OR has_admin_role(p_user_id, 'admin');
  END IF;

  IF p_permission IN ('force_winner', 'hard_reset_leaderboard') THEN
    RETURN has_admin_role(p_user_id, 'super_admin');
  END IF;

  IF p_permission IN ('adjust_wallet', 'refund_match', 'manage_shop', 'manage_settings', 'ban_user') THEN
    RETURN has_admin_role(p_user_id, 'admin');
  END IF;

  IF p_permission IN ('support_refund') THEN
    RETURN has_admin_role(p_user_id, 'support') OR has_admin_role(p_user_id, 'admin');
  END IF;

  RETURN is_admin(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_broadcast_notification(
  p_title TEXT,
  p_message TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_sender_player_id UUID;
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

  SELECT id
  INTO v_sender_player_id
  FROM players
  WHERE auth_id = v_user_id
  LIMIT 1;

  INSERT INTO notifications (player_id, type, title, message, sender_id)
  SELECT
    p.id,
    'system',
    trim(p_title),
    trim(p_message),
    v_sender_player_id
  FROM players p
  WHERE COALESCE(p.is_banned, false) = false;

  GET DIAGNOSTICS v_sent_count = ROW_COUNT;

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

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_admin_role(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_admin_permission(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION admin_broadcast_notification(TEXT, TEXT, TEXT) TO authenticated;

