-- ============================================================================
-- Admin wallet freeze/unfreeze controls
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_set_wallet_frozen(
  p_target_user_id UUID,
  p_is_frozen BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS wallets AS $$
DECLARE
  v_wallet wallets;
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'adjust_wallet') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  PERFORM create_wallet_if_not_exists(p_target_user_id);

  UPDATE wallets
  SET
    is_frozen = p_is_frozen,
    updated_at = NOW()
  WHERE user_id = p_target_user_id
  RETURNING * INTO v_wallet;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  PERFORM log_admin_action(
    'admin_set_wallet_frozen',
    'wallet',
    v_wallet.id,
    NULL,
    jsonb_build_object(
      'user_id', p_target_user_id,
      'is_frozen', p_is_frozen
    ),
    trim(p_reason)
  );

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_set_wallet_frozen(UUID, BOOLEAN, TEXT) TO authenticated;

