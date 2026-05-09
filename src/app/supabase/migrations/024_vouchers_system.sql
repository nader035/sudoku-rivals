-- ============================================================================
-- Voucher system: free coins + purchase discounts
-- Owner/Admin can manage vouchers
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_kind_type') THEN
    CREATE TYPE voucher_kind_type AS ENUM ('free_coins', 'discount_percent', 'discount_fixed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  kind voucher_kind_type NOT NULL,
  free_coins BIGINT NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  max_total_redemptions INTEGER,
  max_redemptions_per_user INTEGER NOT NULL DEFAULT 1,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vouchers_reward_check CHECK (
    (kind = 'free_coins' AND free_coins > 0) OR
    (kind = 'discount_percent' AND discount_percent > 0 AND discount_percent <= 100) OR
    (kind = 'discount_fixed' AND discount_amount > 0)
  ),
  CONSTRAINT vouchers_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active, starts_at, ends_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_code_upper ON vouchers((upper(code)));

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN ('free_coins', 'purchase_discount')),
  status TEXT NOT NULL CHECK (status IN ('granted', 'applied', 'rejected')),
  coins_awarded BIGINT NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_created ON voucher_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_purchase ON voucher_redemptions(purchase_id);

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS voucher_discount_amount NUMERIC NOT NULL DEFAULT 0;

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

  IF p_permission IN ('adjust_wallet', 'refund_match', 'manage_shop', 'manage_settings', 'ban_user', 'manage_vouchers') THEN
    RETURN has_admin_role(p_user_id, 'admin');
  END IF;

  IF p_permission IN ('support_refund') THEN
    RETURN has_admin_role(p_user_id, 'support') OR has_admin_role(p_user_id, 'admin');
  END IF;

  RETURN is_admin(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_upsert_voucher(
  p_id UUID,
  p_code TEXT,
  p_title TEXT,
  p_kind voucher_kind_type,
  p_free_coins BIGINT DEFAULT 0,
  p_discount_percent NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_max_total_redemptions INTEGER DEFAULT NULL,
  p_max_redemptions_per_user INTEGER DEFAULT 1,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_description TEXT DEFAULT NULL
)
RETURNS vouchers AS $$
DECLARE
  v_voucher vouchers;
  v_code TEXT;
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'manage_vouchers') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  v_code := upper(trim(COALESCE(p_code, '')));
  IF length(v_code) < 3 THEN
    RAISE EXCEPTION 'Voucher code must be at least 3 characters';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO vouchers (
      code, title, description, kind, free_coins, discount_percent, discount_amount,
      max_total_redemptions, max_redemptions_per_user, starts_at, ends_at, is_active,
      created_by, updated_by
    )
    VALUES (
      v_code, trim(p_title), NULLIF(trim(COALESCE(p_description, '')), ''), p_kind,
      GREATEST(COALESCE(p_free_coins, 0), 0),
      GREATEST(COALESCE(p_discount_percent, 0), 0),
      GREATEST(COALESCE(p_discount_amount, 0), 0),
      p_max_total_redemptions,
      GREATEST(COALESCE(p_max_redemptions_per_user, 1), 1),
      p_starts_at, p_ends_at, COALESCE(p_is_active, true),
      auth.uid(), auth.uid()
    )
    RETURNING * INTO v_voucher;
  ELSE
    UPDATE vouchers
    SET
      code = v_code,
      title = trim(p_title),
      description = NULLIF(trim(COALESCE(p_description, '')), ''),
      kind = p_kind,
      free_coins = GREATEST(COALESCE(p_free_coins, 0), 0),
      discount_percent = GREATEST(COALESCE(p_discount_percent, 0), 0),
      discount_amount = GREATEST(COALESCE(p_discount_amount, 0), 0),
      max_total_redemptions = p_max_total_redemptions,
      max_redemptions_per_user = GREATEST(COALESCE(p_max_redemptions_per_user, 1), 1),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      is_active = COALESCE(p_is_active, true),
      updated_by = auth.uid(),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_voucher;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Voucher not found';
    END IF;
  END IF;

  RETURN v_voucher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_set_voucher_active(
  p_voucher_id UUID,
  p_is_active BOOLEAN
)
RETURNS vouchers AS $$
DECLARE
  v_voucher vouchers;
BEGIN
  IF NOT has_admin_permission(auth.uid(), 'manage_vouchers') THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  UPDATE vouchers
  SET
    is_active = p_is_active,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_voucher_id
  RETURNING * INTO v_voucher;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  RETURN v_voucher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION redeem_free_coins_voucher(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_voucher vouchers;
  v_user_uses INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_voucher
  FROM vouchers
  WHERE upper(code) = upper(trim(COALESCE(p_code, '')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  IF NOT v_voucher.is_active THEN
    RAISE EXCEPTION 'Voucher is inactive';
  END IF;
  IF v_voucher.kind <> 'free_coins' THEN
    RAISE EXCEPTION 'This voucher is not a free coins voucher';
  END IF;
  IF v_voucher.starts_at IS NOT NULL AND NOW() < v_voucher.starts_at THEN
    RAISE EXCEPTION 'Voucher is not active yet';
  END IF;
  IF v_voucher.ends_at IS NOT NULL AND NOW() > v_voucher.ends_at THEN
    RAISE EXCEPTION 'Voucher has expired';
  END IF;
  IF v_voucher.max_total_redemptions IS NOT NULL AND v_voucher.current_redemptions >= v_voucher.max_total_redemptions THEN
    RAISE EXCEPTION 'Voucher redemption limit reached';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_user_uses
  FROM voucher_redemptions vr
  WHERE vr.user_id = v_user_id
    AND vr.voucher_id = v_voucher.id
    AND vr.status IN ('granted', 'applied');

  IF v_user_uses >= v_voucher.max_redemptions_per_user THEN
    RAISE EXCEPTION 'Voucher already used by this account';
  END IF;

  PERFORM create_wallet_if_not_exists(v_user_id);
  PERFORM credit_wallet(
    v_user_id,
    v_voucher.free_coins,
    'bonus',
    NULL,
    format('Voucher %s redeemed', v_voucher.code),
    NULL
  );

  INSERT INTO voucher_redemptions (
    user_id, voucher_id, redemption_type, status, coins_awarded, discount_amount
  )
  VALUES (
    v_user_id, v_voucher.id, 'free_coins', 'granted', v_voucher.free_coins, 0
  );

  UPDATE vouchers
  SET
    current_redemptions = current_redemptions + 1,
    updated_by = v_user_id,
    updated_at = NOW()
  WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', v_voucher.kind,
    'code', v_voucher.code,
    'coinsAwarded', v_voucher.free_coins
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_manual_purchase(
  p_package_id UUID,
  p_payment_method purchase_payment_method,
  p_idempotency_key TEXT,
  p_voucher_code TEXT
)
RETURNS purchases AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_package shop_packages;
  v_purchase purchases;
  v_key TEXT;
  v_destination TEXT;
  v_voucher vouchers;
  v_discount NUMERIC := 0;
  v_user_uses INTEGER := 0;
  v_amount_paid NUMERIC := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_package
  FROM shop_packages
  WHERE id = p_package_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive package';
  END IF;

  IF p_payment_method = 'vodafone_cash' THEN
    v_destination := get_platform_setting_jsonb('vodafone_cash_number', to_jsonb('+01022175316')) #>> '{}';
  ELSE
    v_destination := get_platform_setting_jsonb('instapay_link', to_jsonb('https://ipn.eg/S/naderas109n/instapay/5ph2Pv')) #>> '{}';
  END IF;

  IF NULLIF(trim(COALESCE(p_voucher_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_voucher
    FROM vouchers
    WHERE upper(code) = upper(trim(p_voucher_code))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Voucher not found';
    END IF;
    IF NOT v_voucher.is_active THEN
      RAISE EXCEPTION 'Voucher is inactive';
    END IF;
    IF v_voucher.kind = 'free_coins' THEN
      RAISE EXCEPTION 'Free coins vouchers must be redeemed from Redeem Voucher';
    END IF;
    IF v_voucher.starts_at IS NOT NULL AND NOW() < v_voucher.starts_at THEN
      RAISE EXCEPTION 'Voucher is not active yet';
    END IF;
    IF v_voucher.ends_at IS NOT NULL AND NOW() > v_voucher.ends_at THEN
      RAISE EXCEPTION 'Voucher has expired';
    END IF;
    IF v_voucher.max_total_redemptions IS NOT NULL AND v_voucher.current_redemptions >= v_voucher.max_total_redemptions THEN
      RAISE EXCEPTION 'Voucher redemption limit reached';
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_user_uses
    FROM voucher_redemptions vr
    WHERE vr.user_id = v_user_id
      AND vr.voucher_id = v_voucher.id
      AND vr.status IN ('granted', 'applied');

    IF v_user_uses >= v_voucher.max_redemptions_per_user THEN
      RAISE EXCEPTION 'Voucher already used by this account';
    END IF;

    IF v_voucher.kind = 'discount_percent' THEN
      v_discount := ROUND(v_package.price * (v_voucher.discount_percent / 100.0), 2);
    ELSIF v_voucher.kind = 'discount_fixed' THEN
      v_discount := v_voucher.discount_amount;
    END IF;
  END IF;

  IF v_discount < 0 THEN v_discount := 0; END IF;
  IF v_discount > v_package.price THEN v_discount := v_package.price; END IF;
  v_amount_paid := GREATEST(v_package.price - v_discount, 0);

  v_key := COALESCE(NULLIF(trim(p_idempotency_key), ''), format('purchase-%s-%s', v_user_id::TEXT, uuid_generate_v4()::TEXT));

  INSERT INTO purchases (
    user_id,
    package_id,
    amount_paid,
    currency,
    coins_received,
    payment_method,
    payment_destination,
    payment_status,
    idempotency_key,
    voucher_id,
    voucher_code,
    voucher_discount_amount
  )
  VALUES (
    v_user_id,
    v_package.id,
    v_amount_paid,
    v_package.currency,
    v_package.coins_amount + v_package.bonus_coins,
    p_payment_method,
    v_destination,
    'awaiting_transfer',
    v_key,
    v_voucher.id,
    CASE WHEN v_voucher.id IS NULL THEN NULL ELSE v_voucher.code END,
    v_discount
  )
  RETURNING * INTO v_purchase;

  IF v_voucher.id IS NOT NULL THEN
    INSERT INTO voucher_redemptions (
      user_id, voucher_id, purchase_id, redemption_type, status, coins_awarded, discount_amount
    )
    VALUES (
      v_user_id, v_voucher.id, v_purchase.id, 'purchase_discount', 'applied', 0, v_discount
    );

    UPDATE vouchers
    SET
      current_redemptions = current_redemptions + 1,
      updated_by = v_user_id,
      updated_at = NOW()
    WHERE id = v_voucher.id;
  END IF;

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_manual_purchase(
  p_package_id UUID,
  p_payment_method purchase_payment_method,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS purchases AS $$
BEGIN
  RETURN create_manual_purchase(p_package_id, p_payment_method, p_idempotency_key, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vouchers_read_active_or_admin" ON vouchers;
CREATE POLICY "vouchers_read_active_or_admin" ON vouchers
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR has_admin_permission(auth.uid(), 'manage_vouchers')));

DROP POLICY IF EXISTS "vouchers_admin_manage" ON vouchers;
CREATE POLICY "vouchers_admin_manage" ON vouchers
  FOR ALL USING (has_admin_permission(auth.uid(), 'manage_vouchers'))
  WITH CHECK (has_admin_permission(auth.uid(), 'manage_vouchers'));

DROP POLICY IF EXISTS "voucher_redemptions_select_own_or_admin" ON voucher_redemptions;
CREATE POLICY "voucher_redemptions_select_own_or_admin" ON voucher_redemptions
  FOR SELECT USING (user_id = auth.uid() OR has_admin_permission(auth.uid(), 'manage_vouchers'));

DROP POLICY IF EXISTS "voucher_redemptions_admin_manage" ON voucher_redemptions;
CREATE POLICY "voucher_redemptions_admin_manage" ON voucher_redemptions
  FOR ALL USING (has_admin_permission(auth.uid(), 'manage_vouchers'))
  WITH CHECK (has_admin_permission(auth.uid(), 'manage_vouchers'));

GRANT EXECUTE ON FUNCTION admin_upsert_voucher(UUID, TEXT, TEXT, voucher_kind_type, BIGINT, NUMERIC, NUMERIC, INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_voucher_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_free_coins_voucher(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_manual_purchase(UUID, purchase_payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_manual_purchase(UUID, purchase_payment_method, TEXT) TO authenticated;
GRANT SELECT ON vouchers TO authenticated;
GRANT SELECT ON voucher_redemptions TO authenticated;

