-- ============================================================================
-- Admin broadcast + payment sender validation improvements
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_manual_purchase_transfer(
  p_purchase_id UUID,
  p_sender_phone TEXT,
  p_sender_name TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_transfer_screenshot_url TEXT DEFAULT NULL,
  p_user_note TEXT DEFAULT NULL
)
RETURNS purchases AS $$
DECLARE
  v_purchase purchases;
  v_sender TEXT;
BEGIN
  SELECT * INTO v_purchase
  FROM purchases
  WHERE id = p_purchase_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.payment_status NOT IN ('awaiting_transfer', 'pending_admin_review') THEN
    RAISE EXCEPTION 'Purchase cannot be updated in current status';
  END IF;

  v_sender := trim(COALESCE(p_sender_phone, ''));

  IF v_purchase.payment_method = 'vodafone_cash' THEN
    IF v_sender = '' OR v_sender !~ '^\+?[0-9]{7,20}$' THEN
      RAISE EXCEPTION 'Vodafone sender phone number is required';
    END IF;
  ELSE
    IF length(v_sender) < 3 THEN
      RAISE EXCEPTION 'InstaPay sender number or username is required';
    END IF;
  END IF;

  UPDATE purchases
  SET
    sender_phone = v_sender,
    sender_name = NULLIF(trim(COALESCE(p_sender_name, '')), ''),
    payment_reference = NULLIF(trim(COALESCE(p_payment_reference, '')), ''),
    transfer_screenshot_url = NULLIF(trim(COALESCE(p_transfer_screenshot_url, '')), ''),
    user_note = NULLIF(trim(COALESCE(p_user_note, '')), ''),
    payment_status = 'pending_admin_review',
    updated_at = NOW()
  WHERE id = p_purchase_id
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
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
  WHERE COALESCE(p.is_active, true) = true
    AND COALESCE(p.is_banned, false) = false;

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

GRANT EXECUTE ON FUNCTION admin_broadcast_notification(TEXT, TEXT, TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Broadcast + payment sender validation update installed.';
END $$;

