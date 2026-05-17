-- ============================================================================
-- MIGRATION 025: Schedule notifications cleanup job
-- ============================================================================
-- Runs cleanup_old_notifications() daily using pg_cron.
-- cleanup_old_notifications() already deletes read notifications older than 30 days.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF to_regprocedure('public.cleanup_old_notifications()') IS NULL THEN
    RAISE EXCEPTION 'cleanup_old_notifications() is missing. Run previous migrations first.';
  END IF;

  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'cron.schedule(text,text,text) is unavailable. pg_cron extension is required.';
  END IF;

  -- Keep the migration idempotent: remove any existing job with this name first.
  IF to_regclass('cron.job') IS NOT NULL THEN
    FOR v_job_id IN
      SELECT jobid
      FROM cron.job
      WHERE jobname = 'cleanup_old_notifications_daily'
    LOOP
      PERFORM cron.unschedule(v_job_id);
    END LOOP;
  END IF;

  -- Daily at 03:17 UTC.
  PERFORM cron.schedule(
    'cleanup_old_notifications_daily',
    '17 3 * * *',
    $cmd$SELECT public.cleanup_old_notifications();$cmd$
  );
END $$;

