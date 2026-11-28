-- ═══════════════════════════════════════════════════════════════════════
--  004 — Pièces jointes (captures d'écran) des retours testeurs
--  Pré-requis : 001 et 003. Les fichiers sont stockés sur Cloudflare R2
--  (upload direct par URL signée via l'Edge Function `portal-upload-url`).
--  Ici : la table, les contrôles, et l'exposition dans le portail et le dashboard.
--  Rollback : DROP FUNCTION admin.portal_finding_attach, admin.portal_upload_check;
--             DROP TABLE docs.test_finding_attachments; (les fonctions *_base
--             peuvent être renommées en sens inverse).
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS docs.test_finding_attachments (
  id_attachment uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id    uuid NOT NULL REFERENCES docs.test_findings(id_finding) ON DELETE CASCADE,
  tester_id     uuid REFERENCES docs.test_testers(id_tester) ON DELETE SET NULL,
  storage_key   text NOT NULL,
  url           text NOT NULL,
  content_type  text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes    integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_key)
);
CREATE INDEX IF NOT EXISTS idx_test_finding_attachments_finding ON docs.test_finding_attachments(finding_id);
ALTER TABLE docs.test_finding_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON docs.test_finding_attachments FROM PUBLIC, anon, authenticated;

-- Appelée par l'Edge Function avant de signer une URL d'envoi.
CREATE OR REPLACE FUNCTION admin.portal_upload_check(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v_cs text;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT status INTO v_cs FROM docs.test_campaigns WHERE id_campaign = t.campaign_id;
  IF v_cs <> 'ACTIVE' THEN RAISE EXCEPTION 'La campagne n''est pas en cours' USING ERRCODE = '22023'; END IF;
  RETURN jsonb_build_object('testerId', t.id_tester, 'campaignId', t.campaign_id);
END $fn$;

-- Rattache des images déjà envoyées à un signalement du testeur (4 maximum).
CREATE OR REPLACE FUNCTION admin.portal_finding_attach(p_token text, p_ref text, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE t docs.test_testers%ROWTYPE; v_id uuid; v_it jsonb; v_n int; v_key text; v_url text;
BEGIN
  t := admin._portal_tester(p_token);
  SELECT id_finding INTO v_id FROM docs.test_findings WHERE code = p_ref AND tester_id = t.id_tester;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Signalement introuvable' USING ERRCODE = 'P0002'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Pièces jointes invalides' USING ERRCODE = '22000'; END IF;
  SELECT count(*) INTO v_n FROM docs.test_finding_attachments WHERE finding_id = v_id;
  IF v_n + jsonb_array_length(p_items) > 4 THEN RAISE EXCEPTION '4 images maximum par signalement' USING ERRCODE = '22023'; END IF;
  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_key := v_it->>'key'; v_url := v_it->>'url';
    IF v_key IS NULL OR v_key NOT LIKE 'tests/' || t.id_tester::text || '/%' OR v_key ~ '\.\.'
       OR v_url IS NULL OR v_url NOT LIKE 'https://%' OR right(v_url, length(v_key)) <> v_key THEN
      RAISE EXCEPTION 'Pièce jointe invalide' USING ERRCODE = '22000';
    END IF;
    INSERT INTO docs.test_finding_attachments (finding_id, tester_id, storage_key, url, content_type, size_bytes)
    VALUES (v_id, t.id_tester, v_key, v_url, v_it->>'contentType', (v_it->>'size')::int);
  END LOOP;
  RETURN admin.portal_finding_get(p_token, p_ref);
END $fn$;

-- portal_finding_get : ajoute les pièces jointes (l'ancienne version devient la base).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'admin' AND p.proname = '_portal_finding_get_base') THEN
    ALTER FUNCTION admin.portal_finding_get(text, text) RENAME TO _portal_finding_get_base;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'admin' AND p.proname = '_tests_finding_json_base') THEN
    ALTER FUNCTION admin._tests_finding_json(uuid) RENAME TO _tests_finding_json_base;
  END IF;
END $$;
REVOKE ALL ON FUNCTION admin._portal_finding_get_base(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin._tests_finding_json_base(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION admin.portal_finding_get(p_token text, p_ref text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
DECLARE v jsonb; t docs.test_testers%ROWTYPE;
BEGIN
  v := admin._portal_finding_get_base(p_token, p_ref);
  t := admin._portal_tester(p_token);
  RETURN v || jsonb_build_object('attachments', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', a.id_attachment, 'url', a.url, 'contentType', a.content_type) ORDER BY a.created_at)
      FROM docs.test_finding_attachments a JOIN docs.test_findings f ON f.id_finding = a.finding_id
     WHERE f.code = p_ref AND f.tester_id = t.id_tester), '[]'::jsonb));
END $fn$;

CREATE OR REPLACE FUNCTION admin._tests_finding_json(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp' AS $fn$
  SELECT admin._tests_finding_json_base(p_id) || jsonb_build_object('attachments', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', a.id_attachment, 'url', a.url, 'contentType', a.content_type,
                                        'size', a.size_bytes, 'createdAt', a.created_at) ORDER BY a.created_at)
      FROM docs.test_finding_attachments a WHERE a.finding_id = p_id), '[]'::jsonb))
$fn$;
REVOKE ALL ON FUNCTION admin._tests_finding_json(uuid) FROM PUBLIC, anon, authenticated;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'admin' AND p.proname IN ('portal_upload_check','portal_finding_attach','portal_finding_get') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f.sig);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
