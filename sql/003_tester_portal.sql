-- ═══════════════════════════════════════════════════════════════════════
--  003 — Portail testeur : API par lien d'invitation (sans compte)
--  Pré-requis : 001_tests_module.sql.
--  Le jeton du lien (/join/<jeton>) tient lieu d'authentification : il est long
--  (64 car. hex) et révocable depuis le dashboard (régénération du jeton).
--  Les fonctions n'exposent que les données du testeur concerné.
--  Rollback : DROP FUNCTION admin.portal_* ; DROP FUNCTION admin._portal_tester.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION admin._portal_tester(p_token text)
RETURNS docs.test_testers LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RAISE EXCEPTION 'Lien invalide' USING ERRCODE = '28000'; END IF;
  SELECT * INTO t FROM docs.test_testers WHERE invite_token = p_token;
  IF NOT FOUND OR t.status IN ('REMOVED','DECLINED') THEN
    RAISE EXCEPTION 'Lien invalide ou expiré' USING ERRCODE = '28000';
  END IF;
  RETURN t;
END $fn$;

-- Ouverture du portail : marque l'arrivée, enregistre l'appareil, renvoie l'accueil.
CREATE OR REPLACE FUNCTION admin.portal_open(p_token text, p_device jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; c docs.test_campaigns%ROWTYPE; v jsonb;
BEGIN
  t := admin._portal_tester(p_token);
  UPDATE docs.test_testers SET
    status = CASE WHEN status = 'INVITED' THEN 'ACTIVE' ELSE status END,
    joined_at = coalesce(joined_at, now()), last_seen_at = now(),
    platform = coalesce(CASE WHEN p_device->>'platform' IN ('ANDROID','IOS') THEN p_device->>'platform' END, platform),
    device_model = coalesce(nullif(left(btrim(coalesce(p_device->>'deviceModel','')),80),''), device_model),
    os_version = coalesce(nullif(left(btrim(coalesce(p_device->>'osVersion','')),40),''), os_version),
    full_name = coalesce(nullif(left(btrim(coalesce(p_device->>'fullName','')),120),''), full_name)
  WHERE id_tester = t.id_tester RETURNING * INTO t;
  SELECT * INTO c FROM docs.test_campaigns WHERE id_campaign = t.campaign_id;

  WITH latest AS (
    SELECT DISTINCT ON (r.scenario_id) r.* FROM docs.test_runs r
     WHERE r.tester_id = t.id_tester ORDER BY r.scenario_id, r.attempt DESC)
  SELECT jsonb_build_object(
    'tester', jsonb_build_object('fullName', t.full_name, 'profile', t.profile, 'platform', t.platform,
               'deviceModel', t.device_model, 'osVersion', t.os_version),
    'campaign', jsonb_build_object('code', c.code, 'name', c.name, 'status', c.status, 'appBuild', c.app_build),
    'runs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', l.id_run, 'code', s.code, 'title', s.title, 'module', s.module, 'priority', s.priority,
        'minutes', s.estimated_minutes, 'status', l.status, 'attempt', l.attempt,
        'stepsTotal', (SELECT count(*) FROM docs.test_run_steps x WHERE x.run_id = l.id_run),
        'stepsDone', (SELECT count(*) FROM docs.test_run_steps x WHERE x.run_id = l.id_run AND x.status <> 'PENDING'))
        ORDER BY (l.status IN ('PASSED','FAILED','BLOCKED','SKIPPED')), s.priority, s.code)
        FROM latest l JOIN docs.test_scenarios s ON s.id_scenario = l.scenario_id), '[]'::jsonb),
    'findings', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', f.code, 'title', f.title, 'status', f.status,
        'type', f.finding_type, 'createdAt', f.created_at,
        'needsReply', f.status = 'NEED_INFO') ORDER BY f.created_at DESC)
        FROM (SELECT * FROM docs.test_findings WHERE tester_id = t.id_tester ORDER BY created_at DESC LIMIT 100) f), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $fn$;

CREATE OR REPLACE FUNCTION admin.portal_run_get(p_token text, p_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v jsonb;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT jsonb_build_object(
    'run', jsonb_build_object('id', r.id_run, 'status', r.status, 'attempt', r.attempt, 'note', r.result_note),
    'scenario', jsonb_build_object('code', s.code, 'title', s.title, 'summary', s.summary, 'priority', s.priority,
        'minutes', s.estimated_minutes, 'preconditionsMd', s.preconditions_md, 'testDataMd', s.test_data_md),
    'canEdit', c.status = 'ACTIVE',
    'campaignStatus', c.status,
    'steps', COALESCE((SELECT jsonb_agg(jsonb_build_object('position', rs.position, 'actionMd', rs.action_md,
        'expectedMd', rs.expected_md, 'status', rs.status, 'comment', rs.comment) ORDER BY rs.position)
        FROM docs.test_run_steps rs WHERE rs.run_id = r.id_run), '[]'::jsonb),
    'findings', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', f.code, 'title', f.title, 'status', f.status)
        ORDER BY f.created_at) FROM docs.test_findings f WHERE f.run_id = r.id_run), '[]'::jsonb)
  ) INTO v
  FROM docs.test_runs r JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
  JOIN docs.test_campaigns c ON c.id_campaign = r.campaign_id
  WHERE r.id_run = p_run_id AND r.tester_id = t.id_tester;
  IF v IS NULL THEN RAISE EXCEPTION 'Test introuvable' USING ERRCODE = 'P0002'; END IF;
  RETURN v;
END $fn$;

-- Enregistre l'avancement (étapes) et/ou le résultat d'un test.
CREATE OR REPLACE FUNCTION admin.portal_run_record(p_token text, p_run_id uuid, p_status text,
  p_note text DEFAULT NULL, p_steps jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; r docs.test_runs%ROWTYPE; v_st jsonb; v_n int; v_final boolean; v_cs text;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT * INTO r FROM docs.test_runs WHERE id_run = p_run_id AND tester_id = t.id_tester FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Test introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT status INTO v_cs FROM docs.test_campaigns WHERE id_campaign = r.campaign_id;
  IF v_cs <> 'ACTIVE' THEN RAISE EXCEPTION 'La campagne n''est pas en cours' USING ERRCODE = '22023'; END IF;
  PERFORM admin._tests_check_enum(p_status, ARRAY['IN_PROGRESS','PASSED','FAILED','BLOCKED','SKIPPED'], 'Statut');
  IF p_steps IS NOT NULL THEN
    IF jsonb_typeof(p_steps) <> 'array' THEN RAISE EXCEPTION 'Étapes invalides' USING ERRCODE = '22000'; END IF;
    FOR v_st IN SELECT * FROM jsonb_array_elements(p_steps) LOOP
      PERFORM admin._tests_check_enum(v_st->>'status', ARRAY['PENDING','PASSED','FAILED','BLOCKED','SKIPPED'], 'Statut d''étape');
      UPDATE docs.test_run_steps SET status = v_st->>'status',
             comment = nullif(left(btrim(coalesce(v_st->>'comment','')),2000),'')
       WHERE run_id = p_run_id AND position = (v_st->>'position')::int;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n = 0 THEN RAISE EXCEPTION 'Étape introuvable' USING ERRCODE = 'P0002'; END IF;
    END LOOP;
  END IF;
  IF p_status = 'PASSED' AND EXISTS (
       SELECT 1 FROM docs.test_run_steps WHERE run_id = p_run_id AND status IN ('FAILED','BLOCKED','PENDING')) THEN
    RAISE EXCEPTION 'Validez d''abord toutes les étapes' USING ERRCODE = '22023';
  END IF;
  v_final := p_status IN ('PASSED','FAILED','BLOCKED','SKIPPED');
  UPDATE docs.test_runs SET status = p_status,
    result_note = CASE WHEN p_note IS NOT NULL THEN nullif(left(btrim(p_note),2000),'') ELSE result_note END,
    started_at = coalesce(started_at, now()),
    finished_at = CASE WHEN v_final THEN now() ELSE NULL END,
    duration_seconds = CASE WHEN v_final THEN greatest(extract(epoch FROM (now() - coalesce(started_at, now())))::int, 0) ELSE NULL END,
    platform = coalesce(platform, t.platform), device_model = coalesce(device_model, t.device_model),
    os_version = coalesce(os_version, t.os_version), app_version = coalesce(app_version, (SELECT app_build FROM docs.test_campaigns WHERE id_campaign = r.campaign_id))
  WHERE id_run = p_run_id;
  UPDATE docs.test_testers SET last_seen_at = now() WHERE id_tester = t.id_tester;
  RETURN admin.portal_run_get(p_token, p_run_id);
END $fn$;

-- Signalement (bug, UX, suggestion, question), lié ou non à un test.
CREATE OR REPLACE FUNCTION admin.portal_finding_create(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v_cs text; v_run uuid; v_type text; v_sev text; v_row docs.test_findings%ROWTYPE;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT status INTO v_cs FROM docs.test_campaigns WHERE id_campaign = t.campaign_id;
  IF v_cs <> 'ACTIVE' THEN RAISE EXCEPTION 'La campagne n''est pas en cours' USING ERRCODE = '22023'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR btrim(coalesce(p_payload->>'title','')) = '' OR btrim(coalesce(p_payload->>'description','')) = '' THEN
    RAISE EXCEPTION 'Titre et description requis' USING ERRCODE = '22000';
  END IF;
  IF (SELECT count(*) FROM docs.test_findings WHERE tester_id = t.id_tester AND created_at > now() - interval '1 day') >= 50 THEN
    RAISE EXCEPTION 'Trop de signalements aujourd''hui' USING ERRCODE = '22023';
  END IF;
  v_run := nullif(p_payload->>'runId','')::uuid;
  IF v_run IS NOT NULL AND NOT EXISTS (SELECT 1 FROM docs.test_runs WHERE id_run = v_run AND tester_id = t.id_tester) THEN
    RAISE EXCEPTION 'Test introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_type := coalesce(nullif(p_payload->>'type',''), 'BUG');
  PERFORM admin._tests_check_enum(v_type, ARRAY['BUG','UX','SUGGESTION','QUESTION'], 'Type');
  v_sev := nullif(p_payload->>'severity','');
  IF v_sev IS NOT NULL THEN
    PERFORM admin._tests_check_enum(v_sev, ARRAY['BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL'], 'Gravité');
  END IF;
  INSERT INTO docs.test_findings (code, campaign_id, run_id, tester_id, finding_type, severity, title, description_md,
      reproduction_steps, expected_behavior, actual_behavior, environment)
  VALUES (admin._tests_next_code('TF','test_findings',true), t.campaign_id, v_run, t.id_tester, v_type, v_sev,
      left(btrim(p_payload->>'title'),200), left(btrim(p_payload->>'description'),5000),
      nullif(left(btrim(coalesce(p_payload->>'reproductionSteps','')),3000),''),
      nullif(left(btrim(coalesce(p_payload->>'expected','')),2000),''),
      nullif(left(btrim(coalesce(p_payload->>'actual','')),2000),''),
      jsonb_build_object('platform', t.platform, 'deviceModel', t.device_model, 'osVersion', t.os_version))
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('code', v_row.code);
END $fn$;

CREATE OR REPLACE FUNCTION admin.portal_finding_get(p_token text, p_ref text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v jsonb;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT jsonb_build_object(
    'code', f.code, 'title', f.title, 'status', f.status, 'type', f.finding_type, 'severity', f.severity,
    'description', f.description_md, 'createdAt', f.created_at,
    'note', CASE WHEN f.status IN ('NEED_INFO','REJECTED') THEN f.triage_note END,
    'canReply', (SELECT status FROM docs.test_campaigns WHERE id_campaign = f.campaign_id) IN ('ACTIVE','PAUSED'),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object('fromTeam', cm.author_kind = 'ADMIN',
        'content', cm.content_md, 'createdAt', cm.created_at) ORDER BY cm.created_at)
        FROM docs.test_finding_comments cm WHERE cm.finding_id = f.id_finding), '[]'::jsonb)
  ) INTO v FROM docs.test_findings f WHERE f.code = p_ref AND f.tester_id = t.id_tester;
  IF v IS NULL THEN RAISE EXCEPTION 'Signalement introuvable' USING ERRCODE = 'P0002'; END IF;
  RETURN v;
END $fn$;

CREATE OR REPLACE FUNCTION admin.portal_finding_comment(p_token text, p_ref text, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v_id uuid;
BEGIN
  t := admin._portal_tester(p_token);
  IF btrim(coalesce(p_content,'')) = '' OR length(p_content) > 3000 THEN
    RAISE EXCEPTION 'Message invalide (1 à 3000 caractères)' USING ERRCODE = '22000';
  END IF;
  SELECT id_finding INTO v_id FROM docs.test_findings WHERE code = p_ref AND tester_id = t.id_tester;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Signalement introuvable' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO docs.test_finding_comments (finding_id, author_kind, content_md) VALUES (v_id, 'TESTER', btrim(p_content));
  -- une réponse à une demande d'infos remet le retour dans la file de tri
  UPDATE docs.test_findings SET status = 'NEW', updated_at = now() WHERE id_finding = v_id AND status = 'NEED_INFO';
  RETURN admin.portal_finding_get(p_token, p_ref);
END $fn$;

REVOKE ALL ON FUNCTION admin._portal_tester(text) FROM PUBLIC, anon, authenticated;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'admin' AND p.proname LIKE 'portal\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f.sig);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
