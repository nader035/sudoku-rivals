-- ============================================================================
-- Fix multiplayer progress validation for penalties and board resets
-- ============================================================================
-- Why:
-- - Match rules now allow board reset at 10 mistakes.
-- - Players can also clear/rework cells, which can reduce computed progress.
-- - Previous trigger raised: "Progress cannot decrease".
--
-- This migration keeps bounds checks but allows valid progress decreases.
-- Mistakes may only decrease on a full reset to 0/0.
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_player_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep hard bounds for server safety.
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'Progress must be between 0 and 100';
  END IF;

  IF NEW.mistakes < 0 THEN
    RAISE EXCEPTION 'Mistakes must be zero or greater';
  END IF;

  -- Allow mistakes to decrease only on a full board reset state.
  IF NEW.mistakes < OLD.mistakes THEN
    IF NOT (NEW.mistakes = 0 AND NEW.progress = 0) THEN
      RAISE EXCEPTION 'Mistakes cannot decrease unless progress resets to 0';
    END IF;
  END IF;

  -- Progress may decrease due to penalties, board clears, or reset rules.
  -- We intentionally do not block decreases anymore.

  -- Auto-finish when progress first reaches 100.
  IF NEW.progress = 100 AND OLD.progress < 100 THEN
    NEW.is_finished = true;
    NEW.finished_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Progress validation updated: decreases allowed for penalty/reset flow.';
END $$;
