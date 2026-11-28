-- ═══════════════════════════════════════════════════════════════════════
--  005 — Notifications e-mail aux testeurs (invitation + réponse de l'équipe)
--  Pré-requis : 001, 002 (liaison de session), 003.
--  L'envoi est fait par l'Edge Function `send-tester-email` (Resend). Ces
--  fonctions préparent le contenu (avec contrôle des droits de l'admin
--  connecté), journalisent chaque envoi et évitent les doublons.
--  Rollback : DROP FUNCTION admin.docs_test_notify_prepare, admin.docs_test_notify_result;
--             DROP TABLE docs.test_notifications;
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS docs.test_notifications (
  id_notification uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        varchar(10) NOT NULL CHECK (kind IN ('INVITE','REPLY')),
  tester_id   uuid NOT NULL REFERENCES docs.test_testers(id_tester) ON DELETE CASCADE,
  finding_id  uuid REFERENCES docs.test_findings(id_finding) ON DELETE CASCADE,
  status      varchar(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  provider_id text,
  error       text,
  created_by  uuid REFERENCES public.users(id_user),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_test_notifications_tester ON docs.test_notifications(tester_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_notifications_finding ON docs.test_notifications(finding_id, created_at DESC);
ALTER TABLE docs.test_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON docs.test_notifications FROM PUBLIC, anon, authenticated;

-- p_ref : id du testeur (INVITE) ou id du retour (REPLY). p_source : 'comment' | 'triage'.
CREATE OR REPLACE FUNCTION admin.docs_test_notify_prepare(
  p_admin_id uuid, p_kind text, p_ref uuid, p_source text DEFAULT 'comment')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE
  v_actor uuid; t docs.test_testers%ROWTYPE; c docs.test_campaigns%ROWTYPE; f docs.test_findings%ROWTYPE;
  v_msg text; v_id uuid;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF p_kind NOT IN ('INVITE','REPLY') THEN RAISE EXCEPTION 'Type de notification invalide' USING ERRCODE = '22000'; END IF;

  IF p_kind = 'INVITE' THEN
    SELECT * INTO t FROM docs.test_testers WHERE id_tester = p_ref;
  ELSE
    SELECT * INTO f FROM docs.test_findings WHERE id_finding = p_ref;
    IF NOT FOUND THEN RAISE EXCEPTION 'Retour introuvable' USING ERRCODE = 'P0002'; END IF;
    SELECT * INTO t FROM docs.test_testers WHERE id_tester = f.tester_id;
  END IF;
  IF NOT FOUND OR t.id_tester IS NULL THEN RAISE EXCEPTION 'Testeur introuvable' USING ERRCODE = 'P0002'; END IF;
  IF t.status IN ('REMOVED','DECLINED') THEN RETURN jsonb_build_object('skipped', 'tester_inactive'); END IF;
  SELECT * INTO c FROM docs.test_campaigns WHERE id_campaign = t.campaign_id;
  IF c.status = 'CANCELLED' THEN RETURN jsonb_build_object('skipped', 'campaign_cancelled'); END IF;

  IF p_kind = 'REPLY' THEN
    IF f.id_finding IS NULL THEN RETURN jsonb_build_object('skipped', 'no_finding'); END IF;
    IF EXISTS (SELECT 1 FROM docs.test_notifications n WHERE n.finding_id = f.id_finding AND n.kind = 'REPLY'
                 AND n.status IN ('PENDING','SENT') AND n.created_at > now() - interval '2 minutes') THEN
      RETURN jsonb_build_object('skipped', 'throttled');
    END IF;
    IF p_source = 'triage' AND coalesce(f.triage_note,'') <> '' THEN v_msg := f.triage_note;
    ELSE
      SELECT cm.content_md INTO v_msg FROM docs.test_finding_comments cm
       WHERE cm.finding_id = f.id_finding AND cm.author_kind = 'ADMIN' ORDER BY cm.created_at DESC LIMIT 1;
      v_msg := coalesce(v_msg, f.triage_note);
    END IF;
    IF coalesce(btrim(v_msg),'') = '' AND f.status <> 'NEED_INFO' AND f.status NOT IN ('CONFIRMED','REJECTED') THEN
      RETURN jsonb_build_object('skipped', 'nothing_to_say');
    END IF;
  END IF;

  INSERT INTO docs.test_notifications (kind, tester_id, finding_id, created_by)
  VALUES (p_kind, t.id_tester, CASE WHEN p_kind = 'REPLY' THEN f.id_finding END, v_actor) RETURNING id_notification INTO v_id;

  RETURN jsonb_build_object(
    'notificationId', v_id, 'kind', p_kind, 'to', t.email, 'name', t.full_name, 'token', t.invite_token,
    'campaign', jsonb_build_object('code', c.code, 'name', c.name, 'status', c.status, 'appBuild', c.app_build),
    'finding', CASE WHEN p_kind = 'REPLY' THEN jsonb_build_object('code', f.code, 'title', f.title, 'status', f.status) END,
    'message', CASE WHEN p_kind = 'REPLY' THEN left(v_msg, 1200) END);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_notify_result(
  p_admin_id uuid, p_notification_id uuid, p_status text, p_provider_id text DEFAULT NULL, p_error text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'write');
  IF p_status NOT IN ('SENT','FAILED') THEN RAISE EXCEPTION 'Statut invalide' USING ERRCODE = '22000'; END IF;
  UPDATE docs.test_notifications SET status = p_status, provider_id = p_provider_id, error = left(p_error, 1000),
         sent_at = CASE WHEN p_status = 'SENT' THEN now() END
   WHERE id_notification = p_notification_id;
  RETURN jsonb_build_object('ok', true);
END $fn$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'admin' AND p.proname IN ('docs_test_notify_prepare','docs_test_notify_result') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
