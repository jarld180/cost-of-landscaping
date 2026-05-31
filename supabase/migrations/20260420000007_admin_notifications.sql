-- Migration: Admin Notifications
-- Persistent notification center for admin dashboard.
-- Triggered automatically on: new COI submissions, new claims, expiring insurance.

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('coi_submitted','claim_submitted','coi_expiring','coi_expired','lead_received')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_read_idx ON admin_notifications (read) WHERE read = false;
CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON admin_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_type_idx ON admin_notifications (type);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notifications"
  ON admin_notifications FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM account_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Trigger: new COI submission → notification
CREATE OR REPLACE FUNCTION notify_admin_on_coi_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company TEXT;
BEGIN
  SELECT company_name INTO v_company FROM contractors WHERE id = NEW.contractor_id;
  INSERT INTO admin_notifications (type, title, body, data)
  VALUES (
    'coi_submitted',
    'New COI Submitted',
    COALESCE(v_company, 'A contractor') || ' submitted a Certificate of Insurance for review.',
    jsonb_build_object(
      'contractor_id', NEW.contractor_id,
      'verification_id', NEW.id,
      'additional_insured_name', NEW.additional_insured_name,
      'policy_expires_at', NEW.policy_expires_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_notify_coi_submission
  AFTER INSERT ON contractor_verifications
  FOR EACH ROW
  WHEN (NEW.type = 'coi')
  EXECUTE FUNCTION notify_admin_on_coi_submission();

-- Trigger: new business claim → notification
CREATE OR REPLACE FUNCTION notify_admin_on_claim_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company TEXT;
BEGIN
  SELECT company_name INTO v_company FROM contractors WHERE id = NEW.contractor_id;
  INSERT INTO admin_notifications (type, title, body, data)
  VALUES (
    'claim_submitted',
    'New Business Claim',
    NEW.claimant_name || ' claimed "' || COALESCE(v_company, 'a contractor') || '".',
    jsonb_build_object(
      'contractor_id', NEW.contractor_id,
      'claim_id', NEW.id,
      'claimant_name', NEW.claimant_name,
      'claimant_email', NEW.claimant_email
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_notify_claim_submission
  AFTER INSERT ON business_claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_claim_submission();

-- Trigger: new lead → notification
CREATE OR REPLACE FUNCTION notify_admin_on_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company TEXT;
BEGIN
  IF NEW.contractor_id IS NOT NULL THEN
    SELECT company_name INTO v_company FROM contractors WHERE id = NEW.contractor_id;
  END IF;
  INSERT INTO admin_notifications (type, title, body, data)
  VALUES (
    'lead_received',
    'New Lead: ' || NEW.name,
    'Contact form submission' || CASE WHEN v_company IS NOT NULL THEN ' for ' || v_company ELSE '' END || '.',
    jsonb_build_object(
      'lead_id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'contractor_id', NEW.contractor_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_notify_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_lead();

-- Nightly job: notify about COIs expiring in 30 days
CREATE OR REPLACE FUNCTION notify_admin_expiring_coi()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT cv.id, cv.contractor_id, cv.policy_expires_at, c.company_name
    FROM contractor_verifications cv
    JOIN contractors c ON c.id = cv.contractor_id
    WHERE cv.status = 'approved'
      AND cv.policy_expires_at BETWEEN CURRENT_DATE + INTERVAL '29 days' AND CURRENT_DATE + INTERVAL '31 days'
  LOOP
    -- Only insert if we haven't already notified today
    IF NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'coi_expiring'
        AND (data->>'verification_id') = v_rec.id::text
        AND created_at::date = CURRENT_DATE
    ) THEN
      INSERT INTO admin_notifications (type, title, body, data)
      VALUES (
        'coi_expiring',
        'COI Expiring in 30 Days',
        COALESCE(v_rec.company_name, 'A contractor') || '''s Certificate of Insurance expires on ' ||
          TO_CHAR(v_rec.policy_expires_at, 'Mon DD, YYYY') || '.',
        jsonb_build_object(
          'contractor_id', v_rec.contractor_id,
          'verification_id', v_rec.id,
          'expires_at', v_rec.policy_expires_at
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- Schedule nightly expiry check at 3am UTC (after the badge expiry job at 2am)
SELECT cron.schedule('notify-expiring-coi', '0 3 * * *', 'SELECT notify_admin_expiring_coi()');
