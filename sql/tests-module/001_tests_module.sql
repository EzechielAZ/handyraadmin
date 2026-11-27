-- ═══════════════════════════════════════════════════════════════════════
--  MODULE « TESTS DE VALIDATION » — migration 001
--  Campagnes de test, scénarios, testeurs, exécutions, retours (findings)
--
--  S'appuie sur le module Documentation existant :
--    docs.releases  → une campagne valide une release
--    docs.features  → un scénario couvre une feature
--    docs.issues    → un retour confirmé devient (ou se rattache à) une issue
--
--  Conventions respectées (identiques à admin.docs_*) :
--    • tables dans le schéma `docs`, RLS activée, AUCUN droit direct
--    • accès uniquement via des fonctions SECURITY DEFINER du schéma `admin`
--    • p_admin_id en 1er paramètre, contrôle via admin.docs_assert_admin
--    • journal d'activité via admin.docs_log_activity
--
--  DIFFÉRENCE DE SÉCURITÉ : toutes les nouvelles fonctions passent par
--  admin.docs_tests_assert, qui vérifie en plus que p_admin_id correspond à
--  la session authentifiée (auth.uid()). Un utilisateur connecté ne peut donc
--  pas se faire passer pour un admin en fournissant son UUID.
--
--  Idempotente : peut être rejouée sans erreur. Annulation : voir
--  001_tests_module.rollback.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Journal d'activité : nouveaux types d'entité ────────────────────
ALTER TABLE docs.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE docs.activity_log ADD CONSTRAINT activity_log_entity_type_check CHECK (
  entity_type::text = ANY (ARRAY[
    'FEATURE','PAGE','ISSUE','RELEASE','RELEASE_FEATURE','RELEASE_OBJECTIVE',
    'CHECKLIST_ITEM','SIGNOFF','ADR','RUNBOOK','GLOSSARY','TAG','COMMENT','CHANGELOG_ENTRY',
    'TEST_CAMPAIGN','TEST_SCENARIO','TEST_TESTER','TEST_RUN','TEST_FINDING'
  ]::text[])
);

-- ─── 2. Permissions (SUPER_ADMIN et ADMIN ont déjà « all/manage ») ──────
INSERT INTO admin.docs_permissions (role_name, domain, action) VALUES
  ('MODERATOR',  'tests', 'write'),
  ('OPERATIONS', 'tests', 'write'),
  ('FINANCE',    'tests', 'read')
ON CONFLICT (role_name, domain, action) DO NOTHING;

-- ─── 3. Tables ──────────────────────────────────────────────────────────

-- 3.1 Scénarios (bibliothèque réutilisable, indépendante des campagnes)
CREATE TABLE IF NOT EXISTS docs.test_scenarios (
  id_scenario       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              varchar(32)  NOT NULL UNIQUE,
  title             varchar(200) NOT NULL,
  summary           text,
  module            varchar(50),
  feature_id        uuid REFERENCES docs.features(id_feature) ON DELETE SET NULL,
  profile           varchar(16)  NOT NULL DEFAULT 'ANY'
                    CHECK (profile IN ('ANY','CLIENT','ARTISAN','ADMIN')),
  priority          varchar(4)   NOT NULL DEFAULT 'P2'
                    CHECK (priority IN ('P0','P1','P2','P3')),
  scenario_type     varchar(20)  NOT NULL DEFAULT 'FUNCTIONAL'
                    CHECK (scenario_type IN ('FUNCTIONAL','SMOKE','REGRESSION','EXPLORATORY',
                                             'USABILITY','PERFORMANCE','SECURITY')),
  preconditions_md  text,
  test_data_md      text,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 480),
  status            varchar(12)  NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','READY','ARCHIVED')),
  revision          integer      NOT NULL DEFAULT 1,
  tags              text[]       NOT NULL DEFAULT '{}',
  search_vector     tsvector GENERATED ALWAYS AS (
                      to_tsvector('simple',
                        coalesce(code,'') || ' ' || coalesce(title,'') || ' ' || coalesce(summary,''))
                    ) STORED,
  created_by        uuid NOT NULL REFERENCES public.users(id_user),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docs.test_scenario_steps (
  id_step      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  uuid NOT NULL REFERENCES docs.test_scenarios(id_scenario) ON DELETE CASCADE,
  position     integer NOT NULL CHECK (position > 0),
  action_md    text NOT NULL,
  expected_md  text NOT NULL,
  UNIQUE (scenario_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- 3.2 Campagnes
CREATE TABLE IF NOT EXISTS docs.test_campaigns (
  id_campaign      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             varchar(32)  NOT NULL UNIQUE,
  name             varchar(200) NOT NULL,
  description_md   text,
  instructions_md  text,
  release_id       uuid REFERENCES docs.releases(id_release) ON DELETE SET NULL,
  status           varchar(12) NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  starts_at        timestamptz,
  ends_at          timestamptz,
  platforms        text[] NOT NULL DEFAULT '{}',
  app_build        varchar(60),
  auto_assign      boolean NOT NULL DEFAULT true,
  exit_criteria    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  closing_report   jsonb,
  closed_at        timestamptz,
  closed_by        uuid REFERENCES public.users(id_user),
  created_by       uuid NOT NULL REFERENCES public.users(id_user),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS docs.test_campaign_scenarios (
  campaign_id  uuid NOT NULL REFERENCES docs.test_campaigns(id_campaign) ON DELETE CASCADE,
  scenario_id  uuid NOT NULL REFERENCES docs.test_scenarios(id_scenario),
  position     integer NOT NULL DEFAULT 0,
  is_required  boolean NOT NULL DEFAULT true,
  added_by     uuid REFERENCES public.users(id_user),
  added_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, scenario_id)
);

-- 3.3 Testeurs (invités par e-mail ; liés à public.users dès que le compte existe)
CREATE TABLE IF NOT EXISTS docs.test_testers (
  id_tester     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES docs.test_campaigns(id_campaign) ON DELETE CASCADE,
  email         varchar(254) NOT NULL,
  full_name     varchar(120),
  phone         varchar(32),
  user_id       uuid REFERENCES public.users(id_user) ON DELETE SET NULL,
  profile       varchar(8) NOT NULL DEFAULT 'BOTH' CHECK (profile IN ('CLIENT','ARTISAN','BOTH')),
  platform      varchar(8) CHECK (platform IS NULL OR platform IN ('ANDROID','IOS')),
  device_model  varchar(80),
  os_version    varchar(40),
  status        varchar(10) NOT NULL DEFAULT 'INVITED'
                CHECK (status IN ('INVITED','ACTIVE','DECLINED','REMOVED')),
  invite_token  varchar(80) NOT NULL UNIQUE
                DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  notes         text,
  invited_by    uuid REFERENCES public.users(id_user),
  invited_at    timestamptz NOT NULL DEFAULT now(),
  joined_at     timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_testers_campaign_email
  ON docs.test_testers (campaign_id, lower(email));

-- 3.4 Exécutions (une ligne = un scénario assigné à un testeur, pour une tentative)
CREATE TABLE IF NOT EXISTS docs.test_runs (
  id_run             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id        uuid NOT NULL REFERENCES docs.test_campaigns(id_campaign) ON DELETE CASCADE,
  scenario_id        uuid NOT NULL REFERENCES docs.test_scenarios(id_scenario),
  tester_id          uuid NOT NULL REFERENCES docs.test_testers(id_tester) ON DELETE CASCADE,
  scenario_revision  integer NOT NULL DEFAULT 1,
  attempt            integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  retest_of          uuid REFERENCES docs.test_runs(id_run) ON DELETE SET NULL,
  status             varchar(12) NOT NULL DEFAULT 'ASSIGNED'
                     CHECK (status IN ('ASSIGNED','IN_PROGRESS','PASSED','FAILED','BLOCKED','SKIPPED')),
  platform           varchar(8),
  device_model       varchar(80),
  os_version         varchar(40),
  app_version        varchar(60),
  result_note        text,
  assigned_by        uuid REFERENCES public.users(id_user),
  assigned_at        timestamptz NOT NULL DEFAULT now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  duration_seconds   integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, scenario_id, tester_id, attempt)
);

-- Étapes copiées du scénario au moment de l'assignation (instantané) :
-- modifier un scénario ne fausse jamais une exécution déjà faite.
CREATE TABLE IF NOT EXISTS docs.test_run_steps (
  id_run_step  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES docs.test_runs(id_run) ON DELETE CASCADE,
  step_id      uuid REFERENCES docs.test_scenario_steps(id_step) ON DELETE SET NULL,
  position     integer NOT NULL CHECK (position > 0),
  action_md    text NOT NULL,
  expected_md  text NOT NULL,
  status       varchar(10) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING','PASSED','FAILED','BLOCKED','SKIPPED')),
  comment      text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, position)
);

-- 3.5 Retours des testeurs (boîte de réception, avant triage)
CREATE TABLE IF NOT EXISTS docs.test_findings (
  id_finding          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                varchar(32) NOT NULL UNIQUE,
  campaign_id         uuid NOT NULL REFERENCES docs.test_campaigns(id_campaign) ON DELETE CASCADE,
  run_id              uuid REFERENCES docs.test_runs(id_run) ON DELETE SET NULL,
  run_step_id         uuid REFERENCES docs.test_run_steps(id_run_step) ON DELETE SET NULL,
  tester_id           uuid REFERENCES docs.test_testers(id_tester) ON DELETE SET NULL,
  finding_type        varchar(12) NOT NULL DEFAULT 'BUG'
                      CHECK (finding_type IN ('BUG','UX','SUGGESTION','QUESTION')),
  severity            varchar(10) CHECK (severity IS NULL OR
                      severity IN ('BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL')),
  title               varchar(200) NOT NULL,
  description_md      text NOT NULL,
  reproduction_steps  text,
  expected_behavior   text,
  actual_behavior     text,
  environment         jsonb,
  attachments         jsonb NOT NULL DEFAULT '[]'::jsonb,
  status              varchar(12) NOT NULL DEFAULT 'NEW'
                      CHECK (status IN ('NEW','NEED_INFO','CONFIRMED','REJECTED')),
  issue_id            uuid REFERENCES docs.issues(id_issue) ON DELETE SET NULL,
  triage_note         text,
  triaged_by          uuid REFERENCES public.users(id_user),
  triaged_at          timestamptz,
  retest_requested_at timestamptz,
  created_by_admin    uuid REFERENCES public.users(id_user),
  search_vector       tsvector GENERATED ALWAYS AS (
                        to_tsvector('simple',
                          coalesce(code,'') || ' ' || coalesce(title,'') || ' ' || coalesce(description_md,''))
                      ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Échanges autour d'un retour (demande de précisions, réponses du testeur)
CREATE TABLE IF NOT EXISTS docs.test_finding_comments (
  id_comment      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id      uuid NOT NULL REFERENCES docs.test_findings(id_finding) ON DELETE CASCADE,
  author_kind     varchar(8) NOT NULL CHECK (author_kind IN ('ADMIN','TESTER')),
  author_user_id  uuid REFERENCES public.users(id_user),
  content_md      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. Index ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_scenarios_status   ON docs.test_scenarios (status, priority);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_module   ON docs.test_scenarios (module);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_feature  ON docs.test_scenarios (feature_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_search   ON docs.test_scenarios USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_test_campaigns_status   ON docs.test_campaigns (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_campaigns_release  ON docs.test_campaigns (release_id);
CREATE INDEX IF NOT EXISTS idx_test_camp_scn_scenario  ON docs.test_campaign_scenarios (scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_testers_user       ON docs.test_testers (user_id);
CREATE INDEX IF NOT EXISTS idx_test_testers_email      ON docs.test_testers (lower(email));
CREATE INDEX IF NOT EXISTS idx_test_runs_campaign      ON docs.test_runs (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_test_runs_tester        ON docs.test_runs (tester_id, status);
CREATE INDEX IF NOT EXISTS idx_test_runs_scenario      ON docs.test_runs (scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_run_steps_run      ON docs.test_run_steps (run_id, position);
CREATE INDEX IF NOT EXISTS idx_test_findings_campaign  ON docs.test_findings (campaign_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_findings_run       ON docs.test_findings (run_id);
CREATE INDEX IF NOT EXISTS idx_test_findings_tester    ON docs.test_findings (tester_id);
CREATE INDEX IF NOT EXISTS idx_test_findings_issue     ON docs.test_findings (issue_id);
CREATE INDEX IF NOT EXISTS idx_test_findings_search    ON docs.test_findings USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_test_finding_comments   ON docs.test_finding_comments (finding_id, created_at);

-- ─── 5. updated_at automatique ──────────────────────────────────────────
DO $trg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['test_scenarios','test_campaigns','test_testers','test_runs',
                           'test_run_steps','test_findings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_docs_%1$s_updated_at ON docs.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_docs_%1$s_updated_at BEFORE UPDATE ON docs.%1$I
                    FOR EACH ROW EXECUTE FUNCTION docs.set_updated_at()', t);
  END LOOP;
END
$trg$;

-- ─── 6. Sécurité : RLS activée, aucun droit direct ─────────────────────
DO $sec$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['test_scenarios','test_scenario_steps','test_campaigns',
                           'test_campaign_scenarios','test_testers','test_runs',
                           'test_run_steps','test_findings','test_finding_comments']
  LOOP
    EXECUTE format('ALTER TABLE docs.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON docs.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END
$sec$;

-- ═══════════════════════════════════════════════════════════════════════
-- 7. HELPERS INTERNES
-- ═══════════════════════════════════════════════════════════════════════

-- 7.1 Contrôle d'accès : permission du rôle + liaison à la session.
CREATE OR REPLACE FUNCTION admin.docs_tests_assert(p_admin_id uuid, p_action text DEFAULT 'read')
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_uid uuid;
BEGIN
  v_actor := admin.docs_assert_admin(p_admin_id, 'tests', p_action);

  -- Liaison à la session : un appel passant par l'API (JWT présent) doit venir
  -- du compte qui correspond à p_admin_id. Les appels internes (SQL Editor,
  -- jobs, service_role) n'ont pas de JWT utilisateur et restent autorisés.
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id_user = v_actor AND u.auth_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Session non autorisée pour cet administrateur' USING ERRCODE = '42501';
  END IF;

  RETURN v_actor;
END $fn$;

-- 7.2 Critères de sortie par défaut d'une campagne
CREATE OR REPLACE FUNCTION admin._tests_default_criteria()
RETURNS jsonb LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT jsonb_build_object(
    'minCoverage',      100,   -- % de scénarios requis exécutés au moins une fois
    'minPassRate',       95,   -- % d'exécutions réussies (réussies / (réussies+échecs+bloquées))
    'requireP0Passed', true,   -- tous les scénarios P0 requis doivent être réussis
    'maxOpenBlocker',     0,   -- issues BLOCKER non résolues issues de la campagne
    'maxOpenCritical',    0    -- issues CRITICAL non résolues issues de la campagne
  )
$fn$;

-- 7.3 Numérotation (même principe que docs_issue_create : verrou + MAX + 1)
CREATE OR REPLACE FUNCTION admin._tests_next_code(p_prefix text, p_table text, p_with_year boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_base text; v_seq int;
BEGIN
  IF p_table NOT IN ('test_campaigns','test_scenarios','test_findings') THEN
    RAISE EXCEPTION 'Table de numérotation invalide: %', p_table USING ERRCODE = '22000';
  END IF;
  v_base := p_prefix || '-' || CASE WHEN p_with_year THEN to_char(now(),'YYYY') || '-' ELSE '' END;
  PERFORM admin.docs_lock_key('docs_' || p_table || '_' || v_base);
  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(substring(code FROM ''(\d+)$'') AS int)), 0) + 1
       FROM docs.%I WHERE code LIKE $1', p_table)
    INTO v_seq USING v_base || '%';
  RETURN v_base || lpad(v_seq::text, 4, '0');
END $fn$;

-- 7.4 Validation d'une valeur parmi une liste
CREATE OR REPLACE FUNCTION admin._tests_check_enum(p_value text, p_allowed text[], p_label text)
RETURNS void LANGUAGE plpgsql IMMUTABLE
AS $fn$
BEGIN
  IF p_value IS NULL OR NOT (p_value = ANY(p_allowed)) THEN
    RAISE EXCEPTION '% invalide : % (attendu : %)', p_label, coalesce(p_value,'∅'),
      array_to_string(p_allowed, ', ') USING ERRCODE = '22000';
  END IF;
END $fn$;

-- 7.5 jsonb → text[] tolérant (null, scalaire ou tableau)
CREATE OR REPLACE FUNCTION admin._tests_text_array(p_json jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT CASE WHEN p_json IS NOT NULL AND jsonb_typeof(p_json) = 'array'
              THEN COALESCE(ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(p_json) x
                                   WHERE btrim(x) <> ''), '{}'::text[])
              ELSE '{}'::text[] END
$fn$;

-- 7.6 Résolution d'une référence (uuid ou code) vers un id
CREATE OR REPLACE FUNCTION admin._tests_resolve(p_entity text, p_ref text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v uuid; v_uuid uuid;
BEGIN
  BEGIN v_uuid := p_ref::uuid; EXCEPTION WHEN invalid_text_representation THEN v_uuid := NULL; END;
  IF p_entity = 'campaign' THEN
    SELECT id_campaign INTO v FROM docs.test_campaigns WHERE id_campaign = v_uuid OR code = p_ref;
  ELSIF p_entity = 'scenario' THEN
    SELECT id_scenario INTO v FROM docs.test_scenarios WHERE id_scenario = v_uuid OR code = p_ref;
  ELSIF p_entity = 'finding' THEN
    SELECT id_finding INTO v FROM docs.test_findings WHERE id_finding = v_uuid OR code = p_ref;
  ELSE
    RAISE EXCEPTION 'Entité inconnue: %', p_entity USING ERRCODE = '22000';
  END IF;
  IF v IS NULL THEN
    RAISE EXCEPTION 'Élément introuvable: %', p_ref USING ERRCODE = 'P0002';
  END IF;
  RETURN v;
END $fn$;

-- 7.7 Validation des étapes d'un scénario
CREATE OR REPLACE FUNCTION admin._tests_validate_steps(p_steps jsonb, p_status text)
RETURNS void LANGUAGE plpgsql IMMUTABLE
AS $fn$
DECLARE v_step jsonb; v_i int := 0;
BEGIN
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' THEN
    RAISE EXCEPTION 'Les étapes doivent être une liste' USING ERRCODE = '22000';
  END IF;
  IF jsonb_array_length(p_steps) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 étapes par scénario' USING ERRCODE = '22000';
  END IF;
  IF p_status = 'READY' AND jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'Un scénario prêt doit avoir au moins une étape' USING ERRCODE = '22000';
  END IF;
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps) LOOP
    v_i := v_i + 1;
    IF jsonb_typeof(v_step) <> 'object'
       OR btrim(coalesce(v_step->>'actionMd','')) = ''
       OR btrim(coalesce(v_step->>'expectedMd','')) = '' THEN
      RAISE EXCEPTION 'Étape % : action et résultat attendu requis', v_i USING ERRCODE = '22000';
    END IF;
  END LOOP;
END $fn$;

-- 7.8 Représentation JSON complète d'un scénario
CREATE OR REPLACE FUNCTION admin._tests_scenario_json(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
  SELECT jsonb_build_object(
    'scenario', to_jsonb(s) - 'search_vector',
    'steps', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id_step', st.id_step, 'position', st.position,
                'action_md', st.action_md, 'expected_md', st.expected_md) ORDER BY st.position)
              FROM docs.test_scenario_steps st WHERE st.scenario_id = s.id_scenario), '[]'::jsonb),
    'feature', (SELECT jsonb_build_object('id_feature', f.id_feature, 'code', f.code,
                  'name', f.name, 'module', f.module)
                FROM docs.features f WHERE f.id_feature = s.feature_id),
    'campaigns', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id_campaign', c.id_campaign, 'code', c.code, 'name', c.name, 'status', c.status,
                'isRequired', cs.is_required) ORDER BY c.created_at DESC)
              FROM docs.test_campaign_scenarios cs
              JOIN docs.test_campaigns c ON c.id_campaign = cs.campaign_id
             WHERE cs.scenario_id = s.id_scenario), '[]'::jsonb),
    'runStats', (SELECT jsonb_build_object(
                'total', count(*),
                'passed',  count(*) FILTER (WHERE r.status = 'PASSED'),
                'failed',  count(*) FILTER (WHERE r.status = 'FAILED'),
                'blocked', count(*) FILTER (WHERE r.status = 'BLOCKED'))
              FROM docs.test_runs r WHERE r.scenario_id = s.id_scenario)
  )
  FROM docs.test_scenarios s WHERE s.id_scenario = p_id
$fn$;

-- 7.9 Copie les étapes d'un scénario dans une exécution (instantané)
CREATE OR REPLACE FUNCTION admin._tests_snapshot_run_steps(p_run_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE n int;
BEGIN
  INSERT INTO docs.test_run_steps (run_id, step_id, position, action_md, expected_md)
  SELECT r.id_run, st.id_step, st.position, st.action_md, st.expected_md
    FROM docs.test_runs r
    JOIN docs.test_scenario_steps st ON st.scenario_id = r.scenario_id
   WHERE r.id_run = p_run_id
     AND NOT EXISTS (SELECT 1 FROM docs.test_run_steps x WHERE x.run_id = r.id_run)
  ON CONFLICT (run_id, position) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 8. SCÉNARIOS
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin.docs_test_scenario_list(
  p_admin_id uuid,
  p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_module text DEFAULT NULL,
  p_profile text DEFAULT NULL, p_priority text DEFAULT NULL, p_type text DEFAULT NULL,
  p_feature_id uuid DEFAULT NULL, p_campaign_id uuid DEFAULT NULL,
  p_sort_by text DEFAULT 'updated_at', p_sort_dir text DEFAULT 'DESC',
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_lmt int; v_off int; v_sort text; v_dir text; v_where text;
  v_items jsonb; v_total bigint; v_stats jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT lmt, off INTO v_lmt, v_off FROM admin.docs_page_bounds(p_page, least(coalesce(p_page_size, 20), 200));

  v_sort := CASE p_sort_by
    WHEN 'code' THEN 'code' WHEN 'title' THEN 'title' WHEN 'priority' THEN 'priority'
    WHEN 'status' THEN 'status' WHEN 'module' THEN 'module' WHEN 'created_at' THEN 'created_at'
    ELSE 'updated_at' END;
  v_dir := CASE upper(coalesce(p_sort_dir,'DESC')) WHEN 'ASC' THEN 'ASC' ELSE 'DESC' END;

  -- Les mêmes filtres servent au total, aux éléments et aux statistiques.
  v_where := $w$
    ($1::text IS NULL OR $1 = '' OR s.search_vector @@ plainto_tsquery('simple', $1)
       OR s.code ILIKE '%' || $1 || '%' OR s.title ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR s.status = $2)
    AND ($3::text IS NULL OR s.module = upper($3))
    AND ($4::text IS NULL OR s.profile = $4)
    AND ($5::text IS NULL OR s.priority = $5)
    AND ($6::text IS NULL OR s.scenario_type = $6)
    AND ($7::uuid IS NULL OR s.feature_id = $7)
    AND ($8::uuid IS NULL OR EXISTS (SELECT 1 FROM docs.test_campaign_scenarios cs
                                      WHERE cs.scenario_id = s.id_scenario AND cs.campaign_id = $8))
  $w$;

  EXECUTE 'SELECT count(*) FROM docs.test_scenarios s WHERE ' || v_where
    INTO v_total USING p_search, p_status, p_module, p_profile, p_priority, p_type, p_feature_id, p_campaign_id;

  EXECUTE format($q$
    SELECT COALESCE(jsonb_agg(x.j ORDER BY x.rn), '[]'::jsonb) FROM (
      SELECT row_number() OVER (ORDER BY s.%1$I %2$s, s.id_scenario) AS rn,
             (to_jsonb(s) - 'search_vector') || jsonb_build_object(
               'stepCount',     (SELECT count(*) FROM docs.test_scenario_steps st WHERE st.scenario_id = s.id_scenario),
               'campaignCount', (SELECT count(*) FROM docs.test_campaign_scenarios cs WHERE cs.scenario_id = s.id_scenario),
               'featureCode',   f.code,
               'featureName',   f.name) AS j
        FROM docs.test_scenarios s
        LEFT JOIN docs.features f ON f.id_feature = s.feature_id
       WHERE %3$s
       ORDER BY s.%1$I %2$s, s.id_scenario
       LIMIT $9 OFFSET $10
    ) x $q$, v_sort, v_dir, v_where)
    INTO v_items USING p_search, p_status, p_module, p_profile, p_priority, p_type, p_feature_id, p_campaign_id, v_lmt, v_off;

  SELECT jsonb_build_object(
    'total', count(*),
    'byStatus',   COALESCE((SELECT jsonb_object_agg(status, c)   FROM (SELECT status, count(*) c FROM docs.test_scenarios GROUP BY status) a), '{}'::jsonb),
    'byModule',   COALESCE((SELECT jsonb_object_agg(module, c)   FROM (SELECT module, count(*) c FROM docs.test_scenarios WHERE module IS NOT NULL AND status <> 'ARCHIVED' GROUP BY module) b), '{}'::jsonb),
    'byPriority', COALESCE((SELECT jsonb_object_agg(priority, c) FROM (SELECT priority, count(*) c FROM docs.test_scenarios WHERE status <> 'ARCHIVED' GROUP BY priority) d), '{}'::jsonb)
  ) INTO v_stats FROM docs.test_scenarios;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'stats', v_stats);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_scenario_get(p_admin_id uuid, p_ref text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  RETURN admin._tests_scenario_json(admin._tests_resolve('scenario', p_ref));
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_scenario_create(p_admin_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_row docs.test_scenarios%ROWTYPE; v_steps jsonb; v_status text;
  v_profile text; v_priority text; v_type text; v_feature uuid; v_est int;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  IF btrim(coalesce(p_payload->>'title','')) = '' THEN
    RAISE EXCEPTION 'Le titre du scénario est requis' USING ERRCODE = '22000';
  END IF;

  v_status   := coalesce(nullif(p_payload->>'status',''), 'DRAFT');
  v_profile  := coalesce(nullif(p_payload->>'profile',''), 'ANY');
  v_priority := coalesce(nullif(p_payload->>'priority',''), 'P2');
  v_type     := coalesce(nullif(p_payload->>'scenarioType',''), 'FUNCTIONAL');
  PERFORM admin._tests_check_enum(v_status,   ARRAY['DRAFT','READY'], 'Statut');
  PERFORM admin._tests_check_enum(v_profile,  ARRAY['ANY','CLIENT','ARTISAN','ADMIN'], 'Profil');
  PERFORM admin._tests_check_enum(v_priority, ARRAY['P0','P1','P2','P3'], 'Priorité');
  PERFORM admin._tests_check_enum(v_type,     ARRAY['FUNCTIONAL','SMOKE','REGRESSION','EXPLORATORY','USABILITY','PERFORMANCE','SECURITY'], 'Type');

  v_steps := coalesce(p_payload->'steps', '[]'::jsonb);
  PERFORM admin._tests_validate_steps(v_steps, v_status);

  v_feature := nullif(p_payload->>'featureId','')::uuid;
  IF v_feature IS NOT NULL AND NOT EXISTS (SELECT 1 FROM docs.features WHERE id_feature = v_feature AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Feature introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_est := nullif(p_payload->>'estimatedMinutes','')::int;

  INSERT INTO docs.test_scenarios (code, title, summary, module, feature_id, profile, priority,
      scenario_type, preconditions_md, test_data_md, estimated_minutes, status, tags, created_by)
  VALUES (admin._tests_next_code('TS', 'test_scenarios', false),
      btrim(p_payload->>'title'), nullif(btrim(coalesce(p_payload->>'summary','')),''),
      nullif(upper(btrim(coalesce(p_payload->>'module',''))),''), v_feature, v_profile, v_priority,
      v_type, nullif(btrim(coalesce(p_payload->>'preconditionsMd','')),''),
      nullif(btrim(coalesce(p_payload->>'testDataMd','')),''), v_est, v_status,
      admin._tests_text_array(p_payload->'tags'), v_actor)
  RETURNING * INTO v_row;

  INSERT INTO docs.test_scenario_steps (scenario_id, position, action_md, expected_md)
  SELECT v_row.id_scenario, t.ord::int, btrim(t.s->>'actionMd'), btrim(t.s->>'expectedMd')
    FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS t(s, ord);

  PERFORM admin.docs_log_activity(v_actor, 'TEST_SCENARIO', v_row.id_scenario, 'CREATED', NULL,
    jsonb_build_object('code', v_row.code, 'title', v_row.title));
  RETURN admin._tests_scenario_json(v_row.id_scenario);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_scenario_update(p_admin_id uuid, p_scenario_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_old docs.test_scenarios%ROWTYPE; v_new docs.test_scenarios%ROWTYPE;
  v_steps jsonb; v_status text; v_old_steps jsonb; v_bump boolean := false;
  v_profile text; v_priority text; v_type text; v_feature uuid;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_old FROM docs.test_scenarios WHERE id_scenario = p_scenario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scénario introuvable' USING ERRCODE = 'P0002'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  IF v_old.status = 'ARCHIVED' AND NOT (p_payload ? 'status') THEN
    RAISE EXCEPTION 'Scénario archivé : restaurez-le avant de le modifier' USING ERRCODE = '22023';
  END IF;

  v_status   := coalesce(nullif(p_payload->>'status',''), v_old.status);
  v_profile  := CASE WHEN p_payload ? 'profile'      THEN p_payload->>'profile'      ELSE v_old.profile END;
  v_priority := CASE WHEN p_payload ? 'priority'     THEN p_payload->>'priority'     ELSE v_old.priority END;
  v_type     := CASE WHEN p_payload ? 'scenarioType' THEN p_payload->>'scenarioType' ELSE v_old.scenario_type END;
  PERFORM admin._tests_check_enum(v_status,   ARRAY['DRAFT','READY','ARCHIVED'], 'Statut');
  PERFORM admin._tests_check_enum(v_profile,  ARRAY['ANY','CLIENT','ARTISAN','ADMIN'], 'Profil');
  PERFORM admin._tests_check_enum(v_priority, ARRAY['P0','P1','P2','P3'], 'Priorité');
  PERFORM admin._tests_check_enum(v_type,     ARRAY['FUNCTIONAL','SMOKE','REGRESSION','EXPLORATORY','USABILITY','PERFORMANCE','SECURITY'], 'Type');
  IF p_payload ? 'title' AND btrim(coalesce(p_payload->>'title','')) = '' THEN
    RAISE EXCEPTION 'Le titre du scénario est requis' USING ERRCODE = '22000';
  END IF;

  IF p_payload ? 'featureId' THEN
    v_feature := nullif(p_payload->>'featureId','')::uuid;
    IF v_feature IS NOT NULL AND NOT EXISTS (SELECT 1 FROM docs.features WHERE id_feature = v_feature AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Feature introuvable' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    v_feature := v_old.feature_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('actionMd', action_md, 'expectedMd', expected_md) ORDER BY position), '[]'::jsonb)
    INTO v_old_steps FROM docs.test_scenario_steps WHERE scenario_id = p_scenario_id;
  v_steps := CASE WHEN p_payload ? 'steps' THEN p_payload->'steps' ELSE v_old_steps END;
  PERFORM admin._tests_validate_steps(v_steps, v_status);

  -- Passer ARCHIVED est refusé si une campagne active utilise ce scénario
  IF v_status = 'ARCHIVED' AND v_old.status <> 'ARCHIVED' AND EXISTS (
       SELECT 1 FROM docs.test_campaign_scenarios cs JOIN docs.test_campaigns c ON c.id_campaign = cs.campaign_id
        WHERE cs.scenario_id = p_scenario_id AND c.status IN ('ACTIVE','PAUSED')) THEN
    RAISE EXCEPTION 'Ce scénario est utilisé par une campagne en cours' USING ERRCODE = '22023';
  END IF;

  -- Le contenu testé change → nouvelle révision
  IF p_payload ? 'steps' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('actionMd', btrim(e->>'actionMd'), 'expectedMd', btrim(e->>'expectedMd'))), '[]'::jsonb)
      INTO v_steps FROM jsonb_array_elements(v_steps) e;
    v_bump := v_steps IS DISTINCT FROM v_old_steps;
  END IF;
  IF (p_payload ? 'preconditionsMd' AND nullif(btrim(coalesce(p_payload->>'preconditionsMd','')),'') IS DISTINCT FROM v_old.preconditions_md)
     OR (p_payload ? 'testDataMd' AND nullif(btrim(coalesce(p_payload->>'testDataMd','')),'') IS DISTINCT FROM v_old.test_data_md) THEN
    v_bump := true;
  END IF;

  UPDATE docs.test_scenarios SET
    title            = CASE WHEN p_payload ? 'title' THEN btrim(p_payload->>'title') ELSE title END,
    summary          = CASE WHEN p_payload ? 'summary' THEN nullif(btrim(coalesce(p_payload->>'summary','')),'') ELSE summary END,
    module           = CASE WHEN p_payload ? 'module' THEN nullif(upper(btrim(coalesce(p_payload->>'module',''))),'') ELSE module END,
    feature_id       = v_feature,
    profile          = v_profile,
    priority         = v_priority,
    scenario_type    = v_type,
    preconditions_md = CASE WHEN p_payload ? 'preconditionsMd' THEN nullif(btrim(coalesce(p_payload->>'preconditionsMd','')),'') ELSE preconditions_md END,
    test_data_md     = CASE WHEN p_payload ? 'testDataMd' THEN nullif(btrim(coalesce(p_payload->>'testDataMd','')),'') ELSE test_data_md END,
    estimated_minutes= CASE WHEN p_payload ? 'estimatedMinutes' THEN nullif(p_payload->>'estimatedMinutes','')::int ELSE estimated_minutes END,
    status           = v_status,
    tags             = CASE WHEN p_payload ? 'tags' THEN admin._tests_text_array(p_payload->'tags') ELSE tags END,
    revision         = CASE WHEN v_bump THEN revision + 1 ELSE revision END
  WHERE id_scenario = p_scenario_id
  RETURNING * INTO v_new;

  IF p_payload ? 'steps' AND v_steps IS DISTINCT FROM v_old_steps THEN
    DELETE FROM docs.test_scenario_steps WHERE scenario_id = p_scenario_id;
    INSERT INTO docs.test_scenario_steps (scenario_id, position, action_md, expected_md)
    SELECT p_scenario_id, t.ord::int, t.s->>'actionMd', t.s->>'expectedMd'
      FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS t(s, ord);
  END IF;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_SCENARIO', p_scenario_id,
    CASE WHEN v_new.status = 'ARCHIVED' AND v_old.status <> 'ARCHIVED' THEN 'ARCHIVED'
         WHEN v_old.status = 'ARCHIVED' AND v_new.status <> 'ARCHIVED' THEN 'RESTORED'
         ELSE 'UPDATED' END,
    to_jsonb(v_old) - 'search_vector', to_jsonb(v_new) - 'search_vector');

  -- Campagne active en auto-assignation : un scénario devenu prêt est distribué
  IF v_new.status = 'READY' AND v_old.status <> 'READY' THEN
    PERFORM admin._tests_generate_runs(c.id_campaign, v_actor)
       FROM docs.test_campaigns c
       JOIN docs.test_campaign_scenarios cs ON cs.campaign_id = c.id_campaign AND cs.scenario_id = p_scenario_id
      WHERE c.status = 'ACTIVE' AND c.auto_assign;
  END IF;

  RETURN admin._tests_scenario_json(p_scenario_id);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_scenario_duplicate(p_admin_id uuid, p_scenario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_src docs.test_scenarios%ROWTYPE; v_new docs.test_scenarios%ROWTYPE;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_src FROM docs.test_scenarios WHERE id_scenario = p_scenario_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scénario introuvable' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO docs.test_scenarios (code, title, summary, module, feature_id, profile, priority,
      scenario_type, preconditions_md, test_data_md, estimated_minutes, status, tags, created_by)
  VALUES (admin._tests_next_code('TS', 'test_scenarios', false),
      left(v_src.title || ' (copie)', 200), v_src.summary, v_src.module, v_src.feature_id, v_src.profile,
      v_src.priority, v_src.scenario_type, v_src.preconditions_md, v_src.test_data_md,
      v_src.estimated_minutes, 'DRAFT', v_src.tags, v_actor)
  RETURNING * INTO v_new;

  INSERT INTO docs.test_scenario_steps (scenario_id, position, action_md, expected_md)
  SELECT v_new.id_scenario, position, action_md, expected_md
    FROM docs.test_scenario_steps WHERE scenario_id = p_scenario_id;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_SCENARIO', v_new.id_scenario, 'CREATED', NULL,
    jsonb_build_object('code', v_new.code, 'duplicatedFrom', v_src.code));
  RETURN admin._tests_scenario_json(v_new.id_scenario);
END $fn$;

-- Import en masse (JSON). Un échec sur une ligne n'annule pas les autres.
-- Un code déjà existant est ignoré (idempotent) : rejouer le même import est sans danger.
CREATE OR REPLACE FUNCTION admin.docs_test_scenario_import(p_admin_id uuid, p_items jsonb, p_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_item jsonb; v_i int := 0; v_created int := 0; v_skipped int := 0;
  v_errors jsonb := '[]'::jsonb; v_codes jsonb := '[]'::jsonb; v_res jsonb; v_feature uuid;
  v_status text; v_profile text; v_priority text; v_type text; v_steps jsonb; v_row docs.test_scenarios%ROWTYPE;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'L''import attend une liste de scénarios' USING ERRCODE = '22000';
  END IF;
  IF jsonb_array_length(p_items) > 300 THEN
    RAISE EXCEPTION 'Maximum 300 scénarios par import' USING ERRCODE = '22000';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_i := v_i + 1;
    BEGIN
      IF jsonb_typeof(v_item) <> 'object' OR btrim(coalesce(v_item->>'title','')) = '' THEN
        RAISE EXCEPTION 'Titre requis' USING ERRCODE = '22000';
      END IF;
      v_status   := coalesce(nullif(v_item->>'status',''), 'DRAFT');
      v_profile  := coalesce(nullif(v_item->>'profile',''), 'ANY');
      v_priority := coalesce(nullif(v_item->>'priority',''), 'P2');
      v_type     := coalesce(nullif(v_item->>'scenarioType',''), 'FUNCTIONAL');
      PERFORM admin._tests_check_enum(v_status,   ARRAY['DRAFT','READY'], 'Statut');
      PERFORM admin._tests_check_enum(v_profile,  ARRAY['ANY','CLIENT','ARTISAN','ADMIN'], 'Profil');
      PERFORM admin._tests_check_enum(v_priority, ARRAY['P0','P1','P2','P3'], 'Priorité');
      PERFORM admin._tests_check_enum(v_type,     ARRAY['FUNCTIONAL','SMOKE','REGRESSION','EXPLORATORY','USABILITY','PERFORMANCE','SECURITY'], 'Type');
      v_steps := coalesce(v_item->'steps', '[]'::jsonb);
      PERFORM admin._tests_validate_steps(v_steps, v_status);

      IF nullif(v_item->>'code','') IS NOT NULL
         AND EXISTS (SELECT 1 FROM docs.test_scenarios WHERE code = v_item->>'code') THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_feature := NULL;
      IF nullif(v_item->>'featureCode','') IS NOT NULL THEN
        SELECT id_feature INTO v_feature FROM docs.features
         WHERE code = v_item->>'featureCode' AND deleted_at IS NULL;
        IF v_feature IS NULL THEN
          RAISE EXCEPTION 'Feature introuvable : %', v_item->>'featureCode' USING ERRCODE = 'P0002';
        END IF;
      END IF;

      IF p_dry_run THEN
        v_created := v_created + 1;
        CONTINUE;
      END IF;

      INSERT INTO docs.test_scenarios (code, title, summary, module, feature_id, profile, priority,
          scenario_type, preconditions_md, test_data_md, estimated_minutes, status, tags, created_by)
      VALUES (coalesce(nullif(v_item->>'code',''), admin._tests_next_code('TS', 'test_scenarios', false)),
          btrim(v_item->>'title'), nullif(btrim(coalesce(v_item->>'summary','')),''),
          nullif(upper(btrim(coalesce(v_item->>'module',''))),''), v_feature, v_profile, v_priority,
          v_type, nullif(btrim(coalesce(v_item->>'preconditionsMd','')),''),
          nullif(btrim(coalesce(v_item->>'testDataMd','')),''), nullif(v_item->>'estimatedMinutes','')::int,
          v_status, admin._tests_text_array(v_item->'tags'), v_actor)
      RETURNING * INTO v_row;

      INSERT INTO docs.test_scenario_steps (scenario_id, position, action_md, expected_md)
      SELECT v_row.id_scenario, t.ord::int, btrim(t.s->>'actionMd'), btrim(t.s->>'expectedMd')
        FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS t(s, ord);

      PERFORM admin.docs_log_activity(v_actor, 'TEST_SCENARIO', v_row.id_scenario, 'CREATED', NULL,
        jsonb_build_object('code', v_row.code, 'title', v_row.title, 'imported', true));
      v_created := v_created + 1;
      v_codes := v_codes || to_jsonb(v_row.code);
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'index', v_i, 'title', left(coalesce(v_item->>'title',''), 80), 'error', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object('dryRun', p_dry_run, 'created', v_created, 'skipped', v_skipped,
    'errors', v_errors, 'codes', v_codes);
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 9. DISTRIBUTION DES EXÉCUTIONS + GO / NO-GO
-- ═══════════════════════════════════════════════════════════════════════

-- 9.1 Dernière tentative par (scénario, testeur) pour une campagne
CREATE OR REPLACE FUNCTION admin._tests_latest_runs(p_campaign_id uuid)
RETURNS TABLE (scenario_id uuid, tester_id uuid, run_id uuid, status text, attempt int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
  SELECT DISTINCT ON (r.scenario_id, r.tester_id)
         r.scenario_id, r.tester_id, r.id_run, r.status::text, r.attempt
    FROM docs.test_runs r
    JOIN docs.test_testers t ON t.id_tester = r.tester_id AND t.status <> 'REMOVED'
   WHERE r.campaign_id = p_campaign_id
   ORDER BY r.scenario_id, r.tester_id, r.attempt DESC
$fn$;

-- 9.2 Crée les exécutions manquantes (idempotent). p_tester_id : limite à un testeur.
CREATE OR REPLACE FUNCTION admin._tests_generate_runs(p_campaign_id uuid, p_actor uuid, p_tester_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_n int := 0; v_run record;
BEGIN
  FOR v_run IN
    INSERT INTO docs.test_runs (campaign_id, scenario_id, tester_id, scenario_revision, attempt,
                                platform, device_model, os_version, assigned_by)
    SELECT cs.campaign_id, s.id_scenario, t.id_tester, s.revision, 1,
           t.platform, t.device_model, t.os_version, p_actor
      FROM docs.test_campaign_scenarios cs
      JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id AND s.status = 'READY'
      JOIN docs.test_testers t ON t.campaign_id = cs.campaign_id
                              AND t.status IN ('INVITED','ACTIVE')
                              AND (p_tester_id IS NULL OR t.id_tester = p_tester_id)
     WHERE cs.campaign_id = p_campaign_id
       AND s.profile <> 'ADMIN'
       AND (s.profile = 'ANY' OR t.profile = 'BOTH' OR t.profile = s.profile)
       AND NOT EXISTS (SELECT 1 FROM docs.test_runs r
                        WHERE r.campaign_id = cs.campaign_id AND r.scenario_id = s.id_scenario
                          AND r.tester_id = t.id_tester)
    ON CONFLICT (campaign_id, scenario_id, tester_id, attempt) DO NOTHING
    RETURNING id_run
  LOOP
    PERFORM admin._tests_snapshot_run_steps(v_run.id_run);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $fn$;

-- 9.3 Findings « ouverts » d'une campagne, avec la sévérité effective
-- (celle de l'issue liée si elle existe, sinon celle du retour).
CREATE OR REPLACE FUNCTION admin._tests_open_findings(p_campaign_id uuid)
RETURNS TABLE (id_finding uuid, severity text, status text, issue_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
  SELECT f.id_finding, coalesce(i.severity, f.severity)::text, f.status::text, f.issue_id
    FROM docs.test_findings f
    LEFT JOIN docs.issues i ON i.id_issue = f.issue_id
   WHERE f.campaign_id = p_campaign_id
     AND f.finding_type = 'BUG'
     AND (   f.status IN ('NEW','NEED_INFO')
          OR (f.status = 'CONFIRMED'
              AND (i.id_issue IS NULL
                   OR i.status NOT IN ('FIXED','VERIFIED','CLOSED','WONT_FIX','DUPLICATE'))))
$fn$;

-- 9.4 Calcul du go / no-go
CREATE OR REPLACE FUNCTION admin._tests_readiness(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_crit jsonb; v_req int; v_cov int; v_green int; v_p0_total int; v_p0_green int;
  v_pass int; v_fail int; v_block int; v_rate numeric; v_coverage numeric;
  v_blocker int; v_critical int; v_untriaged int; v_checks jsonb := '[]'::jsonb;
  v_ok boolean; v_total_runs int; v_done_runs int;
BEGIN
  SELECT admin._tests_default_criteria() || coalesce(exit_criteria, '{}'::jsonb)
    INTO v_crit FROM docs.test_campaigns WHERE id_campaign = p_campaign_id;
  IF v_crit IS NULL THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;

  WITH lr AS (SELECT * FROM admin._tests_latest_runs(p_campaign_id)),
  per_scn AS (
    SELECT cs.scenario_id, s.priority, cs.is_required,
           count(*) FILTER (WHERE lr.status IN ('PASSED','FAILED','BLOCKED')) AS executed,
           count(*) FILTER (WHERE lr.status = 'PASSED')                       AS passed,
           count(*) FILTER (WHERE lr.status IN ('FAILED','BLOCKED'))          AS bad
      FROM docs.test_campaign_scenarios cs
      JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id
      LEFT JOIN lr ON lr.scenario_id = cs.scenario_id
     WHERE cs.campaign_id = p_campaign_id
     GROUP BY cs.scenario_id, s.priority, cs.is_required
  )
  SELECT count(*) FILTER (WHERE is_required),
         count(*) FILTER (WHERE is_required AND executed > 0),
         count(*) FILTER (WHERE is_required AND passed > 0 AND bad = 0),
         count(*) FILTER (WHERE is_required AND priority = 'P0'),
         count(*) FILTER (WHERE is_required AND priority = 'P0' AND passed > 0 AND bad = 0)
    INTO v_req, v_cov, v_green, v_p0_total, v_p0_green
    FROM per_scn;

  SELECT count(*) FILTER (WHERE status = 'PASSED'),
         count(*) FILTER (WHERE status = 'FAILED'),
         count(*) FILTER (WHERE status = 'BLOCKED'),
         count(*),
         count(*) FILTER (WHERE status IN ('PASSED','FAILED','BLOCKED','SKIPPED'))
    INTO v_pass, v_fail, v_block, v_total_runs, v_done_runs
    FROM admin._tests_latest_runs(p_campaign_id);

  v_coverage := CASE WHEN v_req = 0 THEN 0 ELSE round(100.0 * v_cov / v_req, 1) END;
  v_rate     := CASE WHEN v_pass + v_fail + v_block = 0 THEN 0
                     ELSE round(100.0 * v_pass / (v_pass + v_fail + v_block), 1) END;

  SELECT count(*) FILTER (WHERE severity = 'BLOCKER'),
         count(*) FILTER (WHERE severity = 'CRITICAL'),
         count(*) FILTER (WHERE status IN ('NEW','NEED_INFO'))
    INTO v_blocker, v_critical, v_untriaged
    FROM admin._tests_open_findings(p_campaign_id);

  -- 1. Couverture
  v_ok := v_req > 0 AND v_coverage >= (v_crit->>'minCoverage')::numeric;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'key','coverage','label','Couverture des scénarios requis',
    'target', (v_crit->>'minCoverage')::numeric, 'actual', v_coverage, 'unit','%',
    'detail', format('%s / %s scénarios requis exécutés', v_cov, v_req), 'ok', v_ok));
  -- 2. Taux de réussite
  v_ok := (v_pass + v_fail + v_block) > 0 AND v_rate >= (v_crit->>'minPassRate')::numeric;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'key','passRate','label','Taux de réussite des exécutions',
    'target', (v_crit->>'minPassRate')::numeric, 'actual', v_rate, 'unit','%',
    'detail', format('%s réussies · %s échecs · %s bloquées', v_pass, v_fail, v_block), 'ok', v_ok));
  -- 3. P0
  IF coalesce((v_crit->>'requireP0Passed')::boolean, true) THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object(
      'key','p0','label','Scénarios P0 tous réussis',
      'target', v_p0_total, 'actual', v_p0_green, 'unit','',
      'detail', format('%s / %s scénarios P0 requis réussis', v_p0_green, v_p0_total),
      'ok', v_p0_green = v_p0_total));
  END IF;
  -- 4. Blocker ouverts
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'key','blocker','label','Bugs BLOCKER ouverts',
    'target', (v_crit->>'maxOpenBlocker')::int, 'actual', v_blocker, 'unit','', 'comparator','max',
    'detail', format('%s ouvert(s)', v_blocker), 'ok', v_blocker <= (v_crit->>'maxOpenBlocker')::int));
  -- 5. Critical ouverts
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'key','critical','label','Bugs CRITICAL ouverts',
    'target', (v_crit->>'maxOpenCritical')::int, 'actual', v_critical, 'unit','', 'comparator','max',
    'detail', format('%s ouvert(s)', v_critical), 'ok', v_critical <= (v_crit->>'maxOpenCritical')::int));

  SELECT bool_and((c->>'ok')::boolean) INTO v_ok FROM jsonb_array_elements(v_checks) c;

  RETURN jsonb_build_object(
    'verdict', CASE WHEN v_ok THEN 'GO' ELSE 'NO_GO' END,
    'ok', v_ok,
    'checks', v_checks,
    'warnings', CASE WHEN v_untriaged > 0
        THEN jsonb_build_array(format('%s retour(s) à trier : le verdict peut changer', v_untriaged))
        ELSE '[]'::jsonb END,
    'metrics', jsonb_build_object(
      'requiredScenarios', v_req, 'coveredScenarios', v_cov, 'greenScenarios', v_green,
      'coverage', v_coverage, 'passRate', v_rate,
      'passed', v_pass, 'failed', v_fail, 'blocked', v_block,
      'runsTotal', v_total_runs, 'runsDone', v_done_runs,
      'openBlocker', v_blocker, 'openCritical', v_critical, 'untriaged', v_untriaged),
    'criteria', v_crit,
    'computedAt', now());
END $fn$;

-- 9.5 Validation + fusion des critères de sortie
CREATE OR REPLACE FUNCTION admin._tests_clean_criteria(p_in jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
AS $fn$
DECLARE v_out jsonb := admin._tests_default_criteria(); k text; v numeric;
BEGIN
  IF p_in IS NULL THEN RETURN v_out; END IF;
  IF jsonb_typeof(p_in) <> 'object' THEN
    RAISE EXCEPTION 'Critères de sortie invalides' USING ERRCODE = '22000';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_in) LOOP
    IF k IN ('minCoverage','minPassRate') THEN
      v := (p_in->>k)::numeric;
      IF v < 0 OR v > 100 THEN RAISE EXCEPTION '% doit être entre 0 et 100', k USING ERRCODE = '22000'; END IF;
      v_out := jsonb_set(v_out, ARRAY[k], to_jsonb(v));
    ELSIF k IN ('maxOpenBlocker','maxOpenCritical') THEN
      v := (p_in->>k)::numeric;
      IF v < 0 OR v <> trunc(v) THEN RAISE EXCEPTION '% doit être un entier ≥ 0', k USING ERRCODE = '22000'; END IF;
      v_out := jsonb_set(v_out, ARRAY[k], to_jsonb(v::int));
    ELSIF k = 'requireP0Passed' THEN
      v_out := jsonb_set(v_out, ARRAY[k], to_jsonb((p_in->>k)::boolean));
    ELSE
      RAISE EXCEPTION 'Critère inconnu : %', k USING ERRCODE = '22000';
    END IF;
  END LOOP;
  RETURN v_out;
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 10. CAMPAGNES
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin._tests_campaign_json(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
  SELECT jsonb_build_object(
    'campaign', to_jsonb(c),
    'release', (SELECT jsonb_build_object('id_release', r.id_release, 'version', r.version, 'status', r.status)
                  FROM docs.releases r WHERE r.id_release = c.release_id),
    'counts', jsonb_build_object(
      'scenarios', (SELECT count(*) FROM docs.test_campaign_scenarios WHERE campaign_id = c.id_campaign),
      'testers',   (SELECT count(*) FROM docs.test_testers WHERE campaign_id = c.id_campaign AND status <> 'REMOVED'),
      'testersActive', (SELECT count(*) FROM docs.test_testers WHERE campaign_id = c.id_campaign AND status = 'ACTIVE'),
      'runs',      (SELECT count(*) FROM docs.test_runs WHERE campaign_id = c.id_campaign),
      'runsByStatus', COALESCE((SELECT jsonb_object_agg(status, n) FROM (
                         SELECT status, count(*) n FROM docs.test_runs WHERE campaign_id = c.id_campaign GROUP BY status) x), '{}'::jsonb),
      'findings',  (SELECT count(*) FROM docs.test_findings WHERE campaign_id = c.id_campaign),
      'findingsByStatus', COALESCE((SELECT jsonb_object_agg(status, n) FROM (
                         SELECT status, count(*) n FROM docs.test_findings WHERE campaign_id = c.id_campaign GROUP BY status) y), '{}'::jsonb))
  )
  FROM docs.test_campaigns c WHERE c.id_campaign = p_id
$fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_list(
  p_admin_id uuid, p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_release_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_lmt int; v_off int; v_items jsonb; v_total bigint; v_stats jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT lmt, off INTO v_lmt, v_off FROM admin.docs_page_bounds(p_page, least(coalesce(p_page_size, 20), 100));

  SELECT count(*) INTO v_total FROM docs.test_campaigns c
   WHERE (p_status IS NULL OR c.status = p_status)
     AND (p_release_id IS NULL OR c.release_id = p_release_id)
     AND (coalesce(p_search,'') = '' OR c.code ILIKE '%'||p_search||'%' OR c.name ILIKE '%'||p_search||'%');

  SELECT COALESCE(jsonb_agg(x.j ORDER BY x.created_at DESC, x.code DESC), '[]'::jsonb) INTO v_items FROM (
    SELECT c.created_at, c.code,
           to_jsonb(c) || jsonb_build_object(
             'releaseVersion', r.version,
             'scenarioCount', (SELECT count(*) FROM docs.test_campaign_scenarios cs WHERE cs.campaign_id = c.id_campaign),
             'testerCount',   (SELECT count(*) FROM docs.test_testers t WHERE t.campaign_id = c.id_campaign AND t.status <> 'REMOVED'),
             'runsTotal',     (SELECT count(*) FROM docs.test_runs ru WHERE ru.campaign_id = c.id_campaign),
             'runsDone',      (SELECT count(*) FROM docs.test_runs ru WHERE ru.campaign_id = c.id_campaign
                                  AND ru.status IN ('PASSED','FAILED','BLOCKED','SKIPPED')),
             'findingsOpen',  (SELECT count(*) FROM docs.test_findings f WHERE f.campaign_id = c.id_campaign
                                  AND f.status IN ('NEW','NEED_INFO'))) AS j
      FROM docs.test_campaigns c
      LEFT JOIN docs.releases r ON r.id_release = c.release_id
     WHERE (p_status IS NULL OR c.status = p_status)
       AND (p_release_id IS NULL OR c.release_id = p_release_id)
       AND (coalesce(p_search,'') = '' OR c.code ILIKE '%'||p_search||'%' OR c.name ILIKE '%'||p_search||'%')
     ORDER BY c.created_at DESC, c.code DESC
     LIMIT v_lmt OFFSET v_off
  ) x;

  SELECT jsonb_build_object('total', count(*),
    'byStatus', COALESCE((SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM docs.test_campaigns GROUP BY status) a), '{}'::jsonb))
    INTO v_stats FROM docs.test_campaigns;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'stats', v_stats);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_get(p_admin_id uuid, p_ref text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_id uuid;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  v_id := admin._tests_resolve('campaign', p_ref);
  RETURN admin._tests_campaign_json(v_id)
      || jsonb_build_object(
           'scenarios', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id_scenario', s.id_scenario, 'code', s.code, 'title', s.title, 'module', s.module,
                'profile', s.profile, 'priority', s.priority, 'scenarioType', s.scenario_type,
                'status', s.status, 'revision', s.revision, 'estimatedMinutes', s.estimated_minutes,
                'isRequired', cs.is_required, 'position', cs.position,
                'stepCount', (SELECT count(*) FROM docs.test_scenario_steps st WHERE st.scenario_id = s.id_scenario))
                ORDER BY cs.position, s.code)
                FROM docs.test_campaign_scenarios cs
                JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id
               WHERE cs.campaign_id = v_id), '[]'::jsonb));
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_create(p_admin_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_row docs.test_campaigns%ROWTYPE; v_release uuid; v_platforms text[];
  v_start timestamptz; v_end timestamptz;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  IF btrim(coalesce(p_payload->>'name','')) = '' THEN
    RAISE EXCEPTION 'Le nom de la campagne est requis' USING ERRCODE = '22000';
  END IF;

  v_release := nullif(p_payload->>'releaseId','')::uuid;
  IF v_release IS NOT NULL AND NOT EXISTS (SELECT 1 FROM docs.releases WHERE id_release = v_release) THEN
    RAISE EXCEPTION 'Release introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_platforms := admin._tests_text_array(p_payload->'platforms');
  IF EXISTS (SELECT 1 FROM unnest(v_platforms) p WHERE p NOT IN ('ANDROID','IOS')) THEN
    RAISE EXCEPTION 'Plateforme invalide (ANDROID, IOS)' USING ERRCODE = '22000';
  END IF;
  v_start := nullif(p_payload->>'startsAt','')::timestamptz;
  v_end   := nullif(p_payload->>'endsAt','')::timestamptz;
  IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end < v_start THEN
    RAISE EXCEPTION 'La date de fin précède la date de début' USING ERRCODE = '22000';
  END IF;

  INSERT INTO docs.test_campaigns (code, name, description_md, instructions_md, release_id, starts_at, ends_at,
      platforms, app_build, auto_assign, exit_criteria, created_by)
  VALUES (admin._tests_next_code('TC', 'test_campaigns', true), btrim(p_payload->>'name'),
      nullif(btrim(coalesce(p_payload->>'descriptionMd','')),''),
      nullif(btrim(coalesce(p_payload->>'instructionsMd','')),''),
      v_release, v_start, v_end, v_platforms,
      nullif(btrim(coalesce(p_payload->>'appBuild','')),''),
      coalesce((p_payload->>'autoAssign')::boolean, true),
      admin._tests_clean_criteria(p_payload->'exitCriteria'), v_actor)
  RETURNING * INTO v_row;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', v_row.id_campaign, 'CREATED', NULL,
    jsonb_build_object('code', v_row.code, 'name', v_row.name));

  -- Scénarios fournis à la création
  IF p_payload ? 'scenarios' AND jsonb_typeof(p_payload->'scenarios') = 'array'
     AND jsonb_array_length(p_payload->'scenarios') > 0 THEN
    PERFORM admin.docs_test_campaign_set_scenarios(p_admin_id, v_row.id_campaign, p_payload->'scenarios');
  END IF;

  RETURN admin._tests_campaign_json(v_row.id_campaign);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_update(p_admin_id uuid, p_campaign_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_old docs.test_campaigns%ROWTYPE; v_new docs.test_campaigns%ROWTYPE;
  v_release uuid; v_platforms text[]; v_start timestamptz; v_end timestamptz;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_old FROM docs.test_campaigns WHERE id_campaign = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  IF p_payload ? 'name' AND btrim(coalesce(p_payload->>'name','')) = '' THEN
    RAISE EXCEPTION 'Le nom de la campagne est requis' USING ERRCODE = '22000';
  END IF;

  v_release := CASE WHEN p_payload ? 'releaseId' THEN nullif(p_payload->>'releaseId','')::uuid ELSE v_old.release_id END;
  IF v_release IS NOT NULL AND NOT EXISTS (SELECT 1 FROM docs.releases WHERE id_release = v_release) THEN
    RAISE EXCEPTION 'Release introuvable' USING ERRCODE = 'P0002';
  END IF;
  v_platforms := CASE WHEN p_payload ? 'platforms' THEN admin._tests_text_array(p_payload->'platforms') ELSE v_old.platforms END;
  IF EXISTS (SELECT 1 FROM unnest(v_platforms) p WHERE p NOT IN ('ANDROID','IOS')) THEN
    RAISE EXCEPTION 'Plateforme invalide (ANDROID, IOS)' USING ERRCODE = '22000';
  END IF;
  v_start := CASE WHEN p_payload ? 'startsAt' THEN nullif(p_payload->>'startsAt','')::timestamptz ELSE v_old.starts_at END;
  v_end   := CASE WHEN p_payload ? 'endsAt'   THEN nullif(p_payload->>'endsAt','')::timestamptz   ELSE v_old.ends_at END;
  IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end < v_start THEN
    RAISE EXCEPTION 'La date de fin précède la date de début' USING ERRCODE = '22000';
  END IF;

  UPDATE docs.test_campaigns SET
    name            = CASE WHEN p_payload ? 'name' THEN btrim(p_payload->>'name') ELSE name END,
    description_md  = CASE WHEN p_payload ? 'descriptionMd' THEN nullif(btrim(coalesce(p_payload->>'descriptionMd','')),'') ELSE description_md END,
    instructions_md = CASE WHEN p_payload ? 'instructionsMd' THEN nullif(btrim(coalesce(p_payload->>'instructionsMd','')),'') ELSE instructions_md END,
    release_id      = v_release,
    starts_at       = v_start,
    ends_at         = v_end,
    platforms       = v_platforms,
    app_build       = CASE WHEN p_payload ? 'appBuild' THEN nullif(btrim(coalesce(p_payload->>'appBuild','')),'') ELSE app_build END,
    auto_assign     = CASE WHEN p_payload ? 'autoAssign' THEN (p_payload->>'autoAssign')::boolean ELSE auto_assign END,
    exit_criteria   = CASE WHEN p_payload ? 'exitCriteria'
                           THEN admin._tests_clean_criteria(v_old.exit_criteria || p_payload->'exitCriteria')
                           ELSE exit_criteria END
  WHERE id_campaign = p_campaign_id
  RETURNING * INTO v_new;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', p_campaign_id, 'UPDATED', to_jsonb(v_old), to_jsonb(v_new));
  RETURN admin._tests_campaign_json(p_campaign_id);
END $fn$;

-- Remplace l'ensemble des scénarios de la campagne.
-- p_items : [{ "scenarioId": uuid, "isRequired": bool }, ...] (l'ordre = l'ordre d'exécution)
CREATE OR REPLACE FUNCTION admin.docs_test_campaign_set_scenarios(p_admin_id uuid, p_campaign_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_c docs.test_campaigns%ROWTYPE; v_ids uuid[]; v_dups int; v_missing int;
  v_not_ready text; v_removed uuid[]; v_started text; v_generated int := 0;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_c FROM docs.test_campaigns WHERE id_campaign = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;
  IF v_c.status IN ('COMPLETED','CANCELLED') THEN
    RAISE EXCEPTION 'Campagne clôturée : modification impossible' USING ERRCODE = '22023';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Liste de scénarios invalide' USING ERRCODE = '22000';
  END IF;

  SELECT array_agg((e->>'scenarioId')::uuid ORDER BY o) INTO v_ids
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, o);
  v_ids := coalesce(v_ids, '{}');

  SELECT count(*) - count(DISTINCT x) INTO v_dups FROM unnest(v_ids) x;
  IF v_dups > 0 THEN RAISE EXCEPTION 'Scénario en double dans la liste' USING ERRCODE = '22000'; END IF;

  SELECT count(*) INTO v_missing FROM unnest(v_ids) x
   WHERE NOT EXISTS (SELECT 1 FROM docs.test_scenarios WHERE id_scenario = x);
  IF v_missing > 0 THEN RAISE EXCEPTION '% scénario(s) introuvable(s)', v_missing USING ERRCODE = 'P0002'; END IF;

  -- Les nouveaux scénarios doivent être prêts
  SELECT string_agg(s.code, ', ') INTO v_not_ready
    FROM docs.test_scenarios s
   WHERE s.id_scenario = ANY(v_ids) AND s.status <> 'READY'
     AND NOT EXISTS (SELECT 1 FROM docs.test_campaign_scenarios cs
                      WHERE cs.campaign_id = p_campaign_id AND cs.scenario_id = s.id_scenario);
  IF v_not_ready IS NOT NULL THEN
    RAISE EXCEPTION 'Scénario(s) non prêt(s) : %', v_not_ready USING ERRCODE = '22023';
  END IF;

  -- Retrait : refusé si déjà exécuté
  SELECT array_agg(cs.scenario_id) INTO v_removed
    FROM docs.test_campaign_scenarios cs
   WHERE cs.campaign_id = p_campaign_id AND NOT (cs.scenario_id = ANY(v_ids));
  IF v_removed IS NOT NULL THEN
    SELECT string_agg(DISTINCT s.code, ', ') INTO v_started
      FROM docs.test_runs r JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
     WHERE r.campaign_id = p_campaign_id AND r.scenario_id = ANY(v_removed)
       AND r.status IN ('IN_PROGRESS','PASSED','FAILED','BLOCKED');
    IF v_started IS NOT NULL THEN
      RAISE EXCEPTION 'Retrait impossible, déjà exécuté : %', v_started USING ERRCODE = '22023';
    END IF;
    DELETE FROM docs.test_runs WHERE campaign_id = p_campaign_id AND scenario_id = ANY(v_removed);
    DELETE FROM docs.test_campaign_scenarios WHERE campaign_id = p_campaign_id AND scenario_id = ANY(v_removed);
  END IF;

  INSERT INTO docs.test_campaign_scenarios (campaign_id, scenario_id, position, is_required, added_by)
  SELECT p_campaign_id, (e->>'scenarioId')::uuid, o::int,
         coalesce((e->>'isRequired')::boolean, true), v_actor
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, o)
  ON CONFLICT (campaign_id, scenario_id)
  DO UPDATE SET position = EXCLUDED.position, is_required = EXCLUDED.is_required;

  IF v_c.status = 'ACTIVE' AND v_c.auto_assign THEN
    v_generated := admin._tests_generate_runs(p_campaign_id, v_actor);
  END IF;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', p_campaign_id, 'SCENARIOS_SET', NULL,
    jsonb_build_object('count', coalesce(array_length(v_ids,1),0), 'runsCreated', v_generated));
  RETURN admin.docs_test_campaign_get(p_admin_id, p_campaign_id::text)
         || jsonb_build_object('runsCreated', v_generated);
END $fn$;

-- Distribution manuelle (campagne en mode non automatique, ou rattrapage)
CREATE OR REPLACE FUNCTION admin.docs_test_campaign_generate_runs(p_admin_id uuid, p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_status text; v_n int;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT status INTO v_status FROM docs.test_campaigns WHERE id_campaign = p_campaign_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;
  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'La campagne doit être active pour distribuer les scénarios' USING ERRCODE = '22023';
  END IF;
  v_n := admin._tests_generate_runs(p_campaign_id, v_actor);
  IF v_n > 0 THEN
    PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', p_campaign_id, 'RUNS_GENERATED', NULL,
      jsonb_build_object('created', v_n));
  END IF;
  RETURN jsonb_build_object('created', v_n);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_transition(
  p_admin_id uuid, p_campaign_id uuid, p_new_status text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_c docs.test_campaigns%ROWTYPE; v_allowed text[]; v_ready int; v_generated int := 0;
  v_report jsonb;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_c FROM docs.test_campaigns WHERE id_campaign = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;

  v_allowed := CASE v_c.status
    WHEN 'DRAFT'     THEN ARRAY['ACTIVE','CANCELLED']
    WHEN 'ACTIVE'    THEN ARRAY['PAUSED','COMPLETED','CANCELLED']
    WHEN 'PAUSED'    THEN ARRAY['ACTIVE','COMPLETED','CANCELLED']
    WHEN 'COMPLETED' THEN ARRAY['ACTIVE']
    WHEN 'CANCELLED' THEN ARRAY['DRAFT']
    ELSE ARRAY[]::text[] END;
  IF p_new_status IS NULL OR NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transition non autorisée : % → %', v_c.status, coalesce(p_new_status,'∅') USING ERRCODE = '22023';
  END IF;

  IF p_new_status = 'ACTIVE' AND v_c.status = 'DRAFT' THEN
    SELECT count(*) INTO v_ready FROM docs.test_campaign_scenarios cs
      JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id AND s.status = 'READY'
     WHERE cs.campaign_id = p_campaign_id;
    IF v_ready = 0 THEN
      RAISE EXCEPTION 'Ajoutez au moins un scénario prêt avant de lancer la campagne' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_new_status = 'COMPLETED' THEN
    v_report := admin._tests_readiness(p_campaign_id);
  END IF;

  UPDATE docs.test_campaigns SET
    status       = p_new_status,
    starts_at    = CASE WHEN p_new_status = 'ACTIVE' AND starts_at IS NULL THEN now() ELSE starts_at END,
    closed_at    = CASE WHEN p_new_status IN ('COMPLETED','CANCELLED') THEN now()
                        WHEN p_new_status IN ('ACTIVE','DRAFT') THEN NULL ELSE closed_at END,
    closed_by    = CASE WHEN p_new_status IN ('COMPLETED','CANCELLED') THEN v_actor
                        WHEN p_new_status IN ('ACTIVE','DRAFT') THEN NULL ELSE closed_by END,
    closing_report = CASE WHEN p_new_status = 'COMPLETED'
                          THEN v_report || jsonb_build_object('reason', p_reason)
                          WHEN p_new_status IN ('ACTIVE','DRAFT') THEN NULL
                          ELSE closing_report END
  WHERE id_campaign = p_campaign_id;

  IF p_new_status = 'ACTIVE' AND v_c.auto_assign THEN
    v_generated := admin._tests_generate_runs(p_campaign_id, v_actor);
  END IF;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', p_campaign_id, 'STATUS_CHANGED',
    jsonb_build_object('status', v_c.status),
    jsonb_build_object('newStatus', p_new_status, 'reason', p_reason, 'runsCreated', v_generated));
  RETURN admin._tests_campaign_json(p_campaign_id) || jsonb_build_object('runsCreated', v_generated);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_readiness(p_admin_id uuid, p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  RETURN admin._tests_readiness(p_campaign_id);
END $fn$;

-- Duplique une campagne (structure + scénarios + critères ; sans testeurs ni exécutions)
CREATE OR REPLACE FUNCTION admin.docs_test_campaign_duplicate(p_admin_id uuid, p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_src docs.test_campaigns%ROWTYPE; v_new docs.test_campaigns%ROWTYPE;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_src FROM docs.test_campaigns WHERE id_campaign = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO docs.test_campaigns (code, name, description_md, instructions_md, release_id, platforms,
      app_build, auto_assign, exit_criteria, created_by)
  VALUES (admin._tests_next_code('TC', 'test_campaigns', true), left(v_src.name || ' (copie)', 200),
      v_src.description_md, v_src.instructions_md, v_src.release_id, v_src.platforms,
      v_src.app_build, v_src.auto_assign, v_src.exit_criteria, v_actor)
  RETURNING * INTO v_new;

  INSERT INTO docs.test_campaign_scenarios (campaign_id, scenario_id, position, is_required, added_by)
  SELECT v_new.id_campaign, cs.scenario_id, cs.position, cs.is_required, v_actor
    FROM docs.test_campaign_scenarios cs
    JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id AND s.status = 'READY'
   WHERE cs.campaign_id = p_campaign_id;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_CAMPAIGN', v_new.id_campaign, 'CREATED', NULL,
    jsonb_build_object('code', v_new.code, 'duplicatedFrom', v_src.code));
  RETURN admin._tests_campaign_json(v_new.id_campaign);
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 11. TESTEURS
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin.docs_test_tester_list(
  p_admin_id uuid, p_campaign_id uuid, p_search text DEFAULT NULL, p_status text DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_lmt int; v_off int; v_items jsonb; v_total bigint; v_stats jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT lmt, off INTO v_lmt, v_off FROM admin.docs_page_bounds(p_page, least(coalesce(p_page_size, 50), 200));

  SELECT count(*) INTO v_total FROM docs.test_testers t
   WHERE t.campaign_id = p_campaign_id
     AND (p_status IS NULL OR t.status = p_status)
     AND (coalesce(p_search,'') = '' OR t.email ILIKE '%'||p_search||'%' OR t.full_name ILIKE '%'||p_search||'%');

  SELECT COALESCE(jsonb_agg(x.j ORDER BY x.invited_at DESC, x.email), '[]'::jsonb) INTO v_items FROM (
    SELECT t.invited_at, t.email,
           to_jsonb(t) || jsonb_build_object(
             'runsTotal',  (SELECT count(*) FROM docs.test_runs r WHERE r.tester_id = t.id_tester),
             'runsDone',   (SELECT count(*) FROM docs.test_runs r WHERE r.tester_id = t.id_tester
                              AND r.status IN ('PASSED','FAILED','BLOCKED','SKIPPED')),
             'runsPassed', (SELECT count(*) FROM docs.test_runs r WHERE r.tester_id = t.id_tester AND r.status = 'PASSED'),
             'runsFailed', (SELECT count(*) FROM docs.test_runs r WHERE r.tester_id = t.id_tester AND r.status IN ('FAILED','BLOCKED')),
             'findings',   (SELECT count(*) FROM docs.test_findings f WHERE f.tester_id = t.id_tester)) AS j
      FROM docs.test_testers t
     WHERE t.campaign_id = p_campaign_id
       AND (p_status IS NULL OR t.status = p_status)
       AND (coalesce(p_search,'') = '' OR t.email ILIKE '%'||p_search||'%' OR t.full_name ILIKE '%'||p_search||'%')
     ORDER BY t.invited_at DESC, t.email
     LIMIT v_lmt OFFSET v_off
  ) x;

  SELECT jsonb_build_object('total', count(*),
    'byStatus', COALESCE((SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) n FROM docs.test_testers WHERE campaign_id = p_campaign_id GROUP BY status) a), '{}'::jsonb),
    'byPlatform', COALESCE((SELECT jsonb_object_agg(platform, n) FROM (
        SELECT platform, count(*) n FROM docs.test_testers
         WHERE campaign_id = p_campaign_id AND status <> 'REMOVED' AND platform IS NOT NULL GROUP BY platform) b), '{}'::jsonb))
    INTO v_stats FROM docs.test_testers WHERE campaign_id = p_campaign_id;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'stats', v_stats);
END $fn$;

-- Invitation en masse. Retourne le jeton de chaque testeur créé : le lien est
-- construit côté dashboard (<portail>/join/<token>).
CREATE OR REPLACE FUNCTION admin.docs_test_tester_invite(p_admin_id uuid, p_campaign_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_c docs.test_campaigns%ROWTYPE; v_item jsonb; v_i int := 0; v_email text;
  v_profile text; v_platform text; v_user uuid; v_row docs.test_testers%ROWTYPE; v_existing docs.test_testers%ROWTYPE;
  v_created jsonb := '[]'::jsonb; v_skipped jsonb := '[]'::jsonb; v_errors jsonb := '[]'::jsonb; v_generated int := 0;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_c FROM docs.test_campaigns WHERE id_campaign = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;
  IF v_c.status IN ('COMPLETED','CANCELLED') THEN
    RAISE EXCEPTION 'Campagne clôturée : invitation impossible' USING ERRCODE = '22023';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Liste de testeurs invalide' USING ERRCODE = '22000';
  END IF;
  IF jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Maximum 200 testeurs par invitation' USING ERRCODE = '22000';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_i := v_i + 1;
    BEGIN
      v_email := lower(btrim(coalesce(v_item->>'email','')));
      IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 254 THEN
        RAISE EXCEPTION 'E-mail invalide' USING ERRCODE = '22000';
      END IF;
      v_profile  := coalesce(nullif(v_item->>'profile',''), 'BOTH');
      v_platform := nullif(upper(coalesce(v_item->>'platform','')), '');
      PERFORM admin._tests_check_enum(v_profile, ARRAY['CLIENT','ARTISAN','BOTH'], 'Profil');
      IF v_platform IS NOT NULL THEN
        PERFORM admin._tests_check_enum(v_platform, ARRAY['ANDROID','IOS'], 'Plateforme');
      END IF;

      SELECT * INTO v_existing FROM docs.test_testers
       WHERE campaign_id = p_campaign_id AND lower(email) = v_email;
      IF FOUND THEN
        IF v_existing.status = 'REMOVED' THEN
          UPDATE docs.test_testers SET status = CASE WHEN user_id IS NOT NULL THEN 'ACTIVE' ELSE 'INVITED' END,
                 profile = v_profile, platform = coalesce(v_platform, platform)
           WHERE id_tester = v_existing.id_tester RETURNING * INTO v_row;
          PERFORM admin.docs_log_activity(v_actor, 'TEST_TESTER', v_row.id_tester, 'REINVITED', NULL,
            jsonb_build_object('email', v_email));
          v_created := v_created || jsonb_build_array(jsonb_build_object(
            'id_tester', v_row.id_tester, 'email', v_row.email, 'invite_token', v_row.invite_token, 'reinvited', true));
        ELSE
          v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('index', v_i, 'email', v_email));
        END IF;
        CONTINUE;
      END IF;

      SELECT id_user INTO v_user FROM public.users
       WHERE lower(email) = v_email AND deleted_at IS NULL LIMIT 1;

      INSERT INTO docs.test_testers (campaign_id, email, full_name, phone, user_id, profile, platform,
          device_model, os_version, notes, invited_by, status, joined_at)
      VALUES (p_campaign_id, v_email, nullif(btrim(coalesce(v_item->>'fullName','')),''),
          nullif(btrim(coalesce(v_item->>'phone','')),''), v_user, v_profile, v_platform,
          nullif(btrim(coalesce(v_item->>'deviceModel','')),''), nullif(btrim(coalesce(v_item->>'osVersion','')),''),
          nullif(btrim(coalesce(v_item->>'notes','')),''), v_actor,
          CASE WHEN v_user IS NOT NULL THEN 'ACTIVE' ELSE 'INVITED' END,
          CASE WHEN v_user IS NOT NULL THEN now() END)
      RETURNING * INTO v_row;

      PERFORM admin.docs_log_activity(v_actor, 'TEST_TESTER', v_row.id_tester, 'INVITED', NULL,
        jsonb_build_object('email', v_email, 'campaign', v_c.code));
      v_created := v_created || jsonb_build_array(jsonb_build_object(
        'id_tester', v_row.id_tester, 'email', v_row.email, 'invite_token', v_row.invite_token,
        'status', v_row.status, 'linkedUser', v_user IS NOT NULL));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'index', v_i, 'email', left(coalesce(v_item->>'email',''), 80), 'error', SQLERRM));
    END;
  END LOOP;

  IF v_c.status = 'ACTIVE' AND v_c.auto_assign AND jsonb_array_length(v_created) > 0 THEN
    v_generated := admin._tests_generate_runs(p_campaign_id, v_actor);
  END IF;

  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped, 'errors', v_errors, 'runsCreated', v_generated);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_tester_update(p_admin_id uuid, p_tester_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_old docs.test_testers%ROWTYPE; v_new docs.test_testers%ROWTYPE; v_c docs.test_campaigns%ROWTYPE;
  v_profile text; v_platform text; v_status text; v_removed_runs int := 0;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_old FROM docs.test_testers WHERE id_tester = p_tester_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Testeur introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_c FROM docs.test_campaigns WHERE id_campaign = v_old.campaign_id;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;

  v_profile  := CASE WHEN p_payload ? 'profile'  THEN p_payload->>'profile' ELSE v_old.profile END;
  v_platform := CASE WHEN p_payload ? 'platform' THEN nullif(upper(coalesce(p_payload->>'platform','')),'') ELSE v_old.platform END;
  v_status   := coalesce(nullif(p_payload->>'status',''), v_old.status);
  PERFORM admin._tests_check_enum(v_profile, ARRAY['CLIENT','ARTISAN','BOTH'], 'Profil');
  PERFORM admin._tests_check_enum(v_status,  ARRAY['INVITED','ACTIVE','DECLINED','REMOVED'], 'Statut');
  IF v_platform IS NOT NULL THEN PERFORM admin._tests_check_enum(v_platform, ARRAY['ANDROID','IOS'], 'Plateforme'); END IF;

  UPDATE docs.test_testers SET
    full_name    = CASE WHEN p_payload ? 'fullName'    THEN nullif(btrim(coalesce(p_payload->>'fullName','')),'') ELSE full_name END,
    phone        = CASE WHEN p_payload ? 'phone'       THEN nullif(btrim(coalesce(p_payload->>'phone','')),'') ELSE phone END,
    profile      = v_profile,
    platform     = v_platform,
    device_model = CASE WHEN p_payload ? 'deviceModel' THEN nullif(btrim(coalesce(p_payload->>'deviceModel','')),'') ELSE device_model END,
    os_version   = CASE WHEN p_payload ? 'osVersion'   THEN nullif(btrim(coalesce(p_payload->>'osVersion','')),'') ELSE os_version END,
    notes        = CASE WHEN p_payload ? 'notes'       THEN nullif(btrim(coalesce(p_payload->>'notes','')),'') ELSE notes END,
    status       = v_status
  WHERE id_tester = p_tester_id RETURNING * INTO v_new;

  -- Retrait : on supprime uniquement ce qui n'a pas été commencé ; l'historique reste.
  IF v_new.status = 'REMOVED' AND v_old.status <> 'REMOVED' THEN
    DELETE FROM docs.test_runs WHERE tester_id = p_tester_id AND status = 'ASSIGNED';
    GET DIAGNOSTICS v_removed_runs = ROW_COUNT;
  END IF;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_TESTER', p_tester_id,
    CASE WHEN v_new.status = 'REMOVED' AND v_old.status <> 'REMOVED' THEN 'REMOVED' ELSE 'UPDATED' END,
    to_jsonb(v_old) - 'invite_token', to_jsonb(v_new) - 'invite_token');

  -- Un changement de profil ou une réactivation peut ouvrir de nouveaux scénarios
  IF v_new.status IN ('INVITED','ACTIVE') AND v_c.status = 'ACTIVE' AND v_c.auto_assign THEN
    PERFORM admin._tests_generate_runs(v_new.campaign_id, v_actor, p_tester_id);
  END IF;

  RETURN to_jsonb(v_new) || jsonb_build_object('runsDeleted', v_removed_runs);
END $fn$;

-- Nouveau lien d'invitation (l'ancien cesse de fonctionner)
CREATE OR REPLACE FUNCTION admin.docs_test_tester_regenerate_token(p_admin_id uuid, p_tester_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_token text;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  UPDATE docs.test_testers
     SET invite_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
   WHERE id_tester = p_tester_id AND status <> 'REMOVED'
  RETURNING invite_token INTO v_token;
  IF v_token IS NULL THEN RAISE EXCEPTION 'Testeur introuvable ou retiré' USING ERRCODE = 'P0002'; END IF;
  PERFORM admin.docs_log_activity(v_actor, 'TEST_TESTER', p_tester_id, 'TOKEN_REGENERATED');
  RETURN jsonb_build_object('id_tester', p_tester_id, 'invite_token', v_token);
END $fn$;

-- Jeton d'un testeur (pour copier le lien d'invitation) — action « write » car sensible
CREATE OR REPLACE FUNCTION admin.docs_test_tester_get_invite(p_admin_id uuid, p_tester_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'write');
  SELECT jsonb_build_object('id_tester', id_tester, 'email', email, 'invite_token', invite_token, 'status', status)
    INTO v FROM docs.test_testers WHERE id_tester = p_tester_id;
  IF v IS NULL THEN RAISE EXCEPTION 'Testeur introuvable' USING ERRCODE = 'P0002'; END IF;
  RETURN v;
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 12. EXÉCUTIONS
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin.docs_test_run_list(
  p_admin_id uuid, p_campaign_id uuid, p_tester_id uuid DEFAULT NULL, p_scenario_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_lmt int; v_off int; v_items jsonb; v_total bigint; v_stats jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT lmt, off INTO v_lmt, v_off FROM admin.docs_page_bounds(p_page, least(coalesce(p_page_size, 50), 200));

  SELECT count(*) INTO v_total FROM docs.test_runs r
   WHERE r.campaign_id = p_campaign_id
     AND (p_tester_id IS NULL OR r.tester_id = p_tester_id)
     AND (p_scenario_id IS NULL OR r.scenario_id = p_scenario_id)
     AND (p_status IS NULL OR r.status = p_status);

  SELECT COALESCE(jsonb_agg(x.j ORDER BY x.code, x.email, x.attempt), '[]'::jsonb) INTO v_items FROM (
    SELECT s.code, t.email, r.attempt,
           to_jsonb(r) || jsonb_build_object(
             'scenarioCode', s.code, 'scenarioTitle', s.title, 'scenarioPriority', s.priority,
             'scenarioRevisionCurrent', s.revision,
             'testerEmail', t.email, 'testerName', t.full_name,
             'stepsTotal', (SELECT count(*) FROM docs.test_run_steps rs WHERE rs.run_id = r.id_run),
             'stepsDone',  (SELECT count(*) FROM docs.test_run_steps rs WHERE rs.run_id = r.id_run AND rs.status <> 'PENDING'),
             'findings',   (SELECT count(*) FROM docs.test_findings f WHERE f.run_id = r.id_run)) AS j
      FROM docs.test_runs r
      JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
      JOIN docs.test_testers t ON t.id_tester = r.tester_id
     WHERE r.campaign_id = p_campaign_id
       AND (p_tester_id IS NULL OR r.tester_id = p_tester_id)
       AND (p_scenario_id IS NULL OR r.scenario_id = p_scenario_id)
       AND (p_status IS NULL OR r.status = p_status)
     ORDER BY s.code, t.email, r.attempt
     LIMIT v_lmt OFFSET v_off
  ) x;

  SELECT jsonb_build_object('total', count(*),
    'byStatus', COALESCE((SELECT jsonb_object_agg(status, n) FROM (
       SELECT status, count(*) n FROM docs.test_runs WHERE campaign_id = p_campaign_id GROUP BY status) a), '{}'::jsonb))
    INTO v_stats FROM docs.test_runs WHERE campaign_id = p_campaign_id;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'stats', v_stats);
END $fn$;

-- Matrice scénarios × testeurs (dernière tentative de chaque couple)
CREATE OR REPLACE FUNCTION admin.docs_test_run_matrix(p_admin_id uuid, p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  RETURN jsonb_build_object(
    'scenarios', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id_scenario', s.id_scenario, 'code', s.code, 'title', s.title, 'priority', s.priority,
        'isRequired', cs.is_required) ORDER BY cs.position, s.code)
      FROM docs.test_campaign_scenarios cs JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id
     WHERE cs.campaign_id = p_campaign_id), '[]'::jsonb),
    'testers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id_tester', t.id_tester, 'email', t.email, 'fullName', t.full_name, 'platform', t.platform,
        'status', t.status) ORDER BY t.email)
      FROM docs.test_testers t WHERE t.campaign_id = p_campaign_id AND t.status <> 'REMOVED'), '[]'::jsonb),
    'cells', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'scenarioId', lr.scenario_id, 'testerId', lr.tester_id, 'runId', lr.run_id,
        'status', lr.status, 'attempt', lr.attempt))
      FROM admin._tests_latest_runs(p_campaign_id) lr), '[]'::jsonb));
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_run_get(p_admin_id uuid, p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT jsonb_build_object(
    'run', to_jsonb(r),
    'scenario', jsonb_build_object('id_scenario', s.id_scenario, 'code', s.code, 'title', s.title,
                 'priority', s.priority, 'revision', s.revision,
                 'preconditionsMd', s.preconditions_md, 'testDataMd', s.test_data_md),
    'tester', jsonb_build_object('id_tester', t.id_tester, 'email', t.email, 'fullName', t.full_name,
                 'platform', t.platform, 'deviceModel', t.device_model, 'osVersion', t.os_version),
    'campaign', jsonb_build_object('id_campaign', c.id_campaign, 'code', c.code, 'name', c.name, 'status', c.status),
    'steps', COALESCE((SELECT jsonb_agg(to_jsonb(rs) ORDER BY rs.position)
                         FROM docs.test_run_steps rs WHERE rs.run_id = r.id_run), '[]'::jsonb),
    'findings', COALESCE((SELECT jsonb_agg(jsonb_build_object('id_finding', f.id_finding, 'code', f.code,
                 'title', f.title, 'severity', f.severity, 'status', f.status, 'finding_type', f.finding_type)
                 ORDER BY f.created_at) FROM docs.test_findings f WHERE f.run_id = r.id_run), '[]'::jsonb),
    'attempts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id_run', o.id_run, 'attempt', o.attempt, 'status', o.status)
                 ORDER BY o.attempt) FROM docs.test_runs o
                 WHERE o.campaign_id = r.campaign_id AND o.scenario_id = r.scenario_id AND o.tester_id = r.tester_id), '[]'::jsonb)
  ) INTO v
  FROM docs.test_runs r
  JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
  JOIN docs.test_testers t ON t.id_tester = r.tester_id
  JOIN docs.test_campaigns c ON c.id_campaign = r.campaign_id
  WHERE r.id_run = p_run_id;
  IF v IS NULL THEN RAISE EXCEPTION 'Exécution introuvable' USING ERRCODE = 'P0002'; END IF;
  RETURN v;
END $fn$;

-- Saisie d'un résultat par un administrateur (testeur sans accès au portail, correction).
-- p_steps : [{ "position": 1, "status": "PASSED|FAILED|BLOCKED|SKIPPED|PENDING", "comment": "..." }]
CREATE OR REPLACE FUNCTION admin.docs_test_run_record(
  p_admin_id uuid, p_run_id uuid, p_status text, p_note text DEFAULT NULL, p_steps jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_r docs.test_runs%ROWTYPE; v_c_status text; v_st jsonb; v_n int; v_final boolean;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_r FROM docs.test_runs WHERE id_run = p_run_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exécution introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT status INTO v_c_status FROM docs.test_campaigns WHERE id_campaign = v_r.campaign_id;
  IF v_c_status IN ('COMPLETED','CANCELLED') THEN
    RAISE EXCEPTION 'Campagne clôturée : résultat non modifiable' USING ERRCODE = '22023';
  END IF;
  PERFORM admin._tests_check_enum(p_status, ARRAY['ASSIGNED','IN_PROGRESS','PASSED','FAILED','BLOCKED','SKIPPED'], 'Statut');

  IF p_steps IS NOT NULL THEN
    IF jsonb_typeof(p_steps) <> 'array' THEN RAISE EXCEPTION 'Étapes invalides' USING ERRCODE = '22000'; END IF;
    FOR v_st IN SELECT * FROM jsonb_array_elements(p_steps) LOOP
      PERFORM admin._tests_check_enum(v_st->>'status', ARRAY['PENDING','PASSED','FAILED','BLOCKED','SKIPPED'], 'Statut d''étape');
      UPDATE docs.test_run_steps
         SET status = v_st->>'status', comment = nullif(btrim(coalesce(v_st->>'comment','')),'')
       WHERE run_id = p_run_id AND position = (v_st->>'position')::int;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n = 0 THEN
        RAISE EXCEPTION 'Étape % introuvable', v_st->>'position' USING ERRCODE = 'P0002';
      END IF;
    END LOOP;
  END IF;

  -- Cohérence : un PASSED exige qu'aucune étape ne soit en échec ou en attente
  IF p_status = 'PASSED' AND EXISTS (
       SELECT 1 FROM docs.test_run_steps WHERE run_id = p_run_id AND status IN ('FAILED','BLOCKED','PENDING')) THEN
    RAISE EXCEPTION 'Impossible de valider : des étapes sont en attente, en échec ou bloquées' USING ERRCODE = '22023';
  END IF;

  v_final := p_status IN ('PASSED','FAILED','BLOCKED','SKIPPED');
  UPDATE docs.test_runs SET
    status      = p_status,
    result_note = CASE WHEN p_note IS NOT NULL THEN nullif(btrim(p_note),'') ELSE result_note END,
    started_at  = CASE WHEN p_status <> 'ASSIGNED' THEN coalesce(started_at, now()) ELSE NULL END,
    finished_at = CASE WHEN v_final THEN now() ELSE NULL END,
    duration_seconds = CASE WHEN v_final AND started_at IS NOT NULL
                            THEN greatest(extract(epoch FROM (now() - started_at))::int, 0) ELSE NULL END
  WHERE id_run = p_run_id;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_RUN', p_run_id, 'RECORDED',
    jsonb_build_object('status', v_r.status), jsonb_build_object('status', p_status, 'note', p_note));
  RETURN admin.docs_test_run_get(p_admin_id, p_run_id);
END $fn$;

-- Demande de re-test : crée une nouvelle tentative sur la version courante du scénario
CREATE OR REPLACE FUNCTION admin.docs_test_run_request_retest(p_admin_id uuid, p_run_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_r docs.test_runs%ROWTYPE; v_s docs.test_scenarios%ROWTYPE; v_c docs.test_campaigns%ROWTYPE;
  v_t docs.test_testers%ROWTYPE; v_max int; v_new uuid;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_r FROM docs.test_runs WHERE id_run = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exécution introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_c FROM docs.test_campaigns WHERE id_campaign = v_r.campaign_id FOR UPDATE;
  IF v_c.status NOT IN ('ACTIVE','PAUSED') THEN
    RAISE EXCEPTION 'La campagne doit être en cours pour demander un re-test' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_t FROM docs.test_testers WHERE id_tester = v_r.tester_id;
  IF v_t.status = 'REMOVED' THEN RAISE EXCEPTION 'Testeur retiré' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_s FROM docs.test_scenarios WHERE id_scenario = v_r.scenario_id;
  IF v_s.status = 'ARCHIVED' THEN RAISE EXCEPTION 'Scénario archivé' USING ERRCODE = '22023'; END IF;

  SELECT max(attempt) INTO v_max FROM docs.test_runs
   WHERE campaign_id = v_r.campaign_id AND scenario_id = v_r.scenario_id AND tester_id = v_r.tester_id;
  IF EXISTS (SELECT 1 FROM docs.test_runs
              WHERE campaign_id = v_r.campaign_id AND scenario_id = v_r.scenario_id AND tester_id = v_r.tester_id
                AND attempt = v_max AND status IN ('ASSIGNED','IN_PROGRESS')) THEN
    RAISE EXCEPTION 'Une tentative est déjà en attente pour ce testeur' USING ERRCODE = '22023';
  END IF;

  INSERT INTO docs.test_runs (campaign_id, scenario_id, tester_id, scenario_revision, attempt, retest_of,
      platform, device_model, os_version, result_note, assigned_by)
  VALUES (v_r.campaign_id, v_r.scenario_id, v_r.tester_id, v_s.revision, v_max + 1, p_run_id,
      v_t.platform, v_t.device_model, v_t.os_version, nullif(btrim(coalesce(p_note,'')),''), v_actor)
  RETURNING id_run INTO v_new;
  PERFORM admin._tests_snapshot_run_steps(v_new);

  PERFORM admin.docs_log_activity(v_actor, 'TEST_RUN', v_new, 'RETEST_REQUESTED', NULL,
    jsonb_build_object('from', p_run_id, 'attempt', v_max + 1, 'note', p_note));
  RETURN admin.docs_test_run_get(p_admin_id, v_new);
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 13. RETOURS (FINDINGS) — boîte de réception, triage, conversion en issue
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin._tests_finding_json(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
  SELECT jsonb_build_object(
    'finding', to_jsonb(f) - 'search_vector',
    'campaign', (SELECT jsonb_build_object('id_campaign', c.id_campaign, 'code', c.code, 'name', c.name, 'status', c.status)
                   FROM docs.test_campaigns c WHERE c.id_campaign = f.campaign_id),
    'tester', (SELECT jsonb_build_object('id_tester', t.id_tester, 'email', t.email, 'fullName', t.full_name,
                      'platform', t.platform, 'deviceModel', t.device_model, 'osVersion', t.os_version)
                 FROM docs.test_testers t WHERE t.id_tester = f.tester_id),
    'run', (SELECT jsonb_build_object('id_run', r.id_run, 'status', r.status, 'attempt', r.attempt,
                      'scenarioId', s.id_scenario, 'scenarioCode', s.code, 'scenarioTitle', s.title)
              FROM docs.test_runs r JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
             WHERE r.id_run = f.run_id),
    'runStep', (SELECT to_jsonb(rs) FROM docs.test_run_steps rs WHERE rs.id_run_step = f.run_step_id),
    'issue', (SELECT jsonb_build_object('id_issue', i.id_issue, 'code', i.code, 'status', i.status,
                      'severity', i.severity, 'priority', i.priority, 'title', i.title)
                FROM docs.issues i WHERE i.id_issue = f.issue_id),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                  'id_comment', cm.id_comment, 'authorKind', cm.author_kind, 'content_md', cm.content_md,
                  'created_at', cm.created_at,
                  'authorName', (SELECT u.full_name FROM public.users u WHERE u.id_user = cm.author_user_id))
                  ORDER BY cm.created_at)
                FROM docs.test_finding_comments cm WHERE cm.finding_id = f.id_finding), '[]'::jsonb)
  )
  FROM docs.test_findings f WHERE f.id_finding = p_id
$fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_finding_list(
  p_admin_id uuid, p_campaign_id uuid DEFAULT NULL, p_search text DEFAULT NULL, p_status text DEFAULT NULL,
  p_severity text DEFAULT NULL, p_type text DEFAULT NULL, p_tester_id uuid DEFAULT NULL, p_run_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_lmt int; v_off int; v_items jsonb; v_total bigint; v_stats jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  SELECT lmt, off INTO v_lmt, v_off FROM admin.docs_page_bounds(p_page, least(coalesce(p_page_size, 30), 100));

  SELECT count(*) INTO v_total FROM docs.test_findings f
   WHERE (p_campaign_id IS NULL OR f.campaign_id = p_campaign_id)
     AND (p_status IS NULL OR f.status = p_status)
     AND (p_severity IS NULL OR f.severity = p_severity)
     AND (p_type IS NULL OR f.finding_type = p_type)
     AND (p_tester_id IS NULL OR f.tester_id = p_tester_id)
     AND (p_run_id IS NULL OR f.run_id = p_run_id)
     AND (coalesce(p_search,'') = '' OR f.search_vector @@ plainto_tsquery('simple', p_search)
          OR f.code ILIKE '%'||p_search||'%' OR f.title ILIKE '%'||p_search||'%');

  SELECT COALESCE(jsonb_agg(x.j ORDER BY x.rank, x.created_at DESC), '[]'::jsonb) INTO v_items FROM (
    SELECT f.created_at,
           -- à trier d'abord, puis par gravité
           CASE f.status WHEN 'NEW' THEN 0 WHEN 'NEED_INFO' THEN 1 ELSE 2 END * 10
           + CASE f.severity WHEN 'BLOCKER' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'MAJOR' THEN 2
                             WHEN 'MINOR' THEN 3 WHEN 'TRIVIAL' THEN 4 ELSE 5 END AS rank,
           (to_jsonb(f) - 'search_vector' - 'description_md') || jsonb_build_object(
             'excerpt', left(f.description_md, 200),
             'campaignCode', c.code,
             'testerEmail', t.email, 'testerName', t.full_name,
             'scenarioCode', s.code,
             'issueCode', i.code, 'issueStatus', i.status,
             'attachmentCount', jsonb_array_length(f.attachments),
             'commentCount', (SELECT count(*) FROM docs.test_finding_comments cm WHERE cm.finding_id = f.id_finding)) AS j
      FROM docs.test_findings f
      JOIN docs.test_campaigns c ON c.id_campaign = f.campaign_id
      LEFT JOIN docs.test_testers t ON t.id_tester = f.tester_id
      LEFT JOIN docs.test_runs r ON r.id_run = f.run_id
      LEFT JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
      LEFT JOIN docs.issues i ON i.id_issue = f.issue_id
     WHERE (p_campaign_id IS NULL OR f.campaign_id = p_campaign_id)
       AND (p_status IS NULL OR f.status = p_status)
       AND (p_severity IS NULL OR f.severity = p_severity)
       AND (p_type IS NULL OR f.finding_type = p_type)
       AND (p_tester_id IS NULL OR f.tester_id = p_tester_id)
       AND (p_run_id IS NULL OR f.run_id = p_run_id)
       AND (coalesce(p_search,'') = '' OR f.search_vector @@ plainto_tsquery('simple', p_search)
            OR f.code ILIKE '%'||p_search||'%' OR f.title ILIKE '%'||p_search||'%')
     ORDER BY 2, f.created_at DESC
     LIMIT v_lmt OFFSET v_off
  ) x;

  SELECT jsonb_build_object('total', count(*),
    'byStatus',   COALESCE((SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) n FROM docs.test_findings WHERE p_campaign_id IS NULL OR campaign_id = p_campaign_id GROUP BY status) a), '{}'::jsonb),
    'bySeverity', COALESCE((SELECT jsonb_object_agg(severity, n) FROM (
        SELECT severity, count(*) n FROM docs.test_findings WHERE severity IS NOT NULL AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id) GROUP BY severity) b), '{}'::jsonb),
    'byType',     COALESCE((SELECT jsonb_object_agg(finding_type, n) FROM (
        SELECT finding_type, count(*) n FROM docs.test_findings WHERE p_campaign_id IS NULL OR campaign_id = p_campaign_id GROUP BY finding_type) d), '{}'::jsonb))
    INTO v_stats FROM docs.test_findings WHERE p_campaign_id IS NULL OR campaign_id = p_campaign_id;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'stats', v_stats);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_finding_get(p_admin_id uuid, p_ref text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  RETURN admin._tests_finding_json(admin._tests_resolve('finding', p_ref));
END $fn$;

-- Saisie d'un retour par un administrateur (testeur hors portail, observation directe)
CREATE OR REPLACE FUNCTION admin.docs_test_finding_create(p_admin_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_campaign uuid; v_run docs.test_runs%ROWTYPE; v_tester uuid; v_type text; v_sev text;
  v_row docs.test_findings%ROWTYPE; v_run_id uuid; v_step uuid; v_c_status text;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  IF btrim(coalesce(p_payload->>'title','')) = '' OR btrim(coalesce(p_payload->>'descriptionMd','')) = '' THEN
    RAISE EXCEPTION 'Titre et description requis' USING ERRCODE = '22000';
  END IF;

  v_run_id := nullif(p_payload->>'runId','')::uuid;
  v_tester := nullif(p_payload->>'testerId','')::uuid;
  v_campaign := nullif(p_payload->>'campaignId','')::uuid;
  IF v_run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM docs.test_runs WHERE id_run = v_run_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Exécution introuvable' USING ERRCODE = 'P0002'; END IF;
    v_campaign := v_run.campaign_id; v_tester := v_run.tester_id;
  END IF;
  IF v_campaign IS NULL THEN RAISE EXCEPTION 'Campagne requise' USING ERRCODE = '22000'; END IF;
  SELECT status INTO v_c_status FROM docs.test_campaigns WHERE id_campaign = v_campaign;
  IF v_c_status IS NULL THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;
  IF v_tester IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM docs.test_testers WHERE id_tester = v_tester AND campaign_id = v_campaign) THEN
    RAISE EXCEPTION 'Testeur étranger à cette campagne' USING ERRCODE = '22023';
  END IF;

  v_type := coalesce(nullif(p_payload->>'findingType',''), 'BUG');
  v_sev  := nullif(p_payload->>'severity','');
  PERFORM admin._tests_check_enum(v_type, ARRAY['BUG','UX','SUGGESTION','QUESTION'], 'Type');
  IF v_sev IS NOT NULL THEN
    PERFORM admin._tests_check_enum(v_sev, ARRAY['BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL'], 'Gravité');
  END IF;

  v_step := nullif(p_payload->>'runStepId','')::uuid;
  IF v_step IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM docs.test_run_steps WHERE id_run_step = v_step AND run_id = v_run_id) THEN
    RAISE EXCEPTION 'Étape étrangère à cette exécution' USING ERRCODE = '22023';
  END IF;

  INSERT INTO docs.test_findings (code, campaign_id, run_id, run_step_id, tester_id, finding_type, severity,
      title, description_md, reproduction_steps, expected_behavior, actual_behavior, environment,
      attachments, created_by_admin)
  VALUES (admin._tests_next_code('TF', 'test_findings', true), v_campaign, v_run_id, v_step, v_tester, v_type, v_sev,
      btrim(p_payload->>'title'), btrim(p_payload->>'descriptionMd'),
      nullif(btrim(coalesce(p_payload->>'reproductionSteps','')),''),
      nullif(btrim(coalesce(p_payload->>'expectedBehavior','')),''),
      nullif(btrim(coalesce(p_payload->>'actualBehavior','')),''),
      p_payload->'environment',
      CASE WHEN jsonb_typeof(p_payload->'attachments') = 'array' THEN p_payload->'attachments' ELSE '[]'::jsonb END,
      v_actor)
  RETURNING * INTO v_row;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_FINDING', v_row.id_finding, 'CREATED', NULL,
    jsonb_build_object('code', v_row.code, 'title', v_row.title));
  RETURN admin._tests_finding_json(v_row.id_finding);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_finding_update(p_admin_id uuid, p_finding_id uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_old docs.test_findings%ROWTYPE; v_type text; v_sev text;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_old FROM docs.test_findings WHERE id_finding = p_finding_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour introuvable' USING ERRCODE = 'P0002'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Données invalides' USING ERRCODE = '22000';
  END IF;
  v_type := CASE WHEN p_payload ? 'findingType' THEN p_payload->>'findingType' ELSE v_old.finding_type END;
  v_sev  := CASE WHEN p_payload ? 'severity' THEN nullif(p_payload->>'severity','') ELSE v_old.severity END;
  PERFORM admin._tests_check_enum(v_type, ARRAY['BUG','UX','SUGGESTION','QUESTION'], 'Type');
  IF v_sev IS NOT NULL THEN
    PERFORM admin._tests_check_enum(v_sev, ARRAY['BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL'], 'Gravité');
  END IF;
  IF p_payload ? 'title' AND btrim(coalesce(p_payload->>'title','')) = '' THEN
    RAISE EXCEPTION 'Titre requis' USING ERRCODE = '22000';
  END IF;

  UPDATE docs.test_findings SET
    finding_type = v_type, severity = v_sev,
    title = CASE WHEN p_payload ? 'title' THEN btrim(p_payload->>'title') ELSE title END,
    description_md = CASE WHEN p_payload ? 'descriptionMd' AND btrim(coalesce(p_payload->>'descriptionMd','')) <> ''
                          THEN btrim(p_payload->>'descriptionMd') ELSE description_md END
  WHERE id_finding = p_finding_id;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_FINDING', p_finding_id, 'UPDATED',
    to_jsonb(v_old) - 'search_vector', NULL);
  RETURN admin._tests_finding_json(p_finding_id);
END $fn$;

-- Triage : CONFIRM | REJECT | NEED_INFO | REOPEN
-- p_payload : { severity?, note?, issueMode?: 'CREATE'|'LINK'|'NONE', issueId?, issuePriority?, featureId? }
CREATE OR REPLACE FUNCTION admin.docs_test_finding_triage(
  p_admin_id uuid, p_finding_id uuid, p_decision text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE
  v_actor uuid; v_f docs.test_findings%ROWTYPE; v_sev text; v_note text; v_mode text; v_issue uuid;
  v_new_status text; v_prio text; v_feature uuid; v_module text; v_res jsonb; v_desc text; v_itype text;
  v_scn_code text; v_camp_code text;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  p_payload := coalesce(p_payload, '{}'::jsonb);
  SELECT * INTO v_f FROM docs.test_findings WHERE id_finding = p_finding_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour introuvable' USING ERRCODE = 'P0002'; END IF;
  PERFORM admin._tests_check_enum(p_decision, ARRAY['CONFIRM','REJECT','NEED_INFO','REOPEN'], 'Décision');

  v_note := nullif(btrim(coalesce(p_payload->>'note','')), '');
  v_sev  := coalesce(nullif(p_payload->>'severity',''), v_f.severity);
  IF v_sev IS NOT NULL THEN
    PERFORM admin._tests_check_enum(v_sev, ARRAY['BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL'], 'Gravité');
  END IF;

  IF p_decision = 'REJECT' THEN
    IF v_note IS NULL THEN RAISE EXCEPTION 'Un motif est requis pour rejeter' USING ERRCODE = '22000'; END IF;
    IF v_f.status = 'CONFIRMED' THEN
      RAISE EXCEPTION 'Retour déjà confirmé : rouvrez-le avant de le rejeter' USING ERRCODE = '22023';
    END IF;
    v_new_status := 'REJECTED';

  ELSIF p_decision = 'NEED_INFO' THEN
    IF v_note IS NULL THEN RAISE EXCEPTION 'Précisez ce qu''il manque' USING ERRCODE = '22000'; END IF;
    IF v_f.status = 'CONFIRMED' THEN
      RAISE EXCEPTION 'Retour déjà confirmé' USING ERRCODE = '22023';
    END IF;
    v_new_status := 'NEED_INFO';
    INSERT INTO docs.test_finding_comments (finding_id, author_kind, author_user_id, content_md)
    VALUES (p_finding_id, 'ADMIN', v_actor, v_note);

  ELSIF p_decision = 'REOPEN' THEN
    IF v_f.status = 'NEW' THEN RAISE EXCEPTION 'Retour déjà à trier' USING ERRCODE = '22023'; END IF;
    v_new_status := 'NEW';

  ELSE -- CONFIRM
    IF v_f.status = 'CONFIRMED' THEN
      RAISE EXCEPTION 'Retour déjà confirmé' USING ERRCODE = '22023';
    END IF;
    IF v_f.finding_type = 'BUG' AND v_sev IS NULL THEN
      RAISE EXCEPTION 'La gravité est requise pour confirmer un bug' USING ERRCODE = '22000';
    END IF;
    v_new_status := 'CONFIRMED';
    v_issue := v_f.issue_id;
    v_mode  := coalesce(nullif(p_payload->>'issueMode',''), CASE WHEN v_issue IS NULL THEN 'CREATE' ELSE 'NONE' END);
    PERFORM admin._tests_check_enum(v_mode, ARRAY['CREATE','LINK','NONE'], 'Mode issue');

    IF v_mode = 'LINK' THEN
      v_issue := nullif(p_payload->>'issueId','')::uuid;
      IF v_issue IS NULL OR NOT EXISTS (SELECT 1 FROM docs.issues WHERE id_issue = v_issue) THEN
        RAISE EXCEPTION 'Issue à rattacher introuvable' USING ERRCODE = 'P0002';
      END IF;

    ELSIF v_mode = 'CREATE' AND v_issue IS NULL THEN
      SELECT s.feature_id, s.module, s.code INTO v_feature, v_module, v_scn_code
        FROM docs.test_runs r JOIN docs.test_scenarios s ON s.id_scenario = r.scenario_id
       WHERE r.id_run = v_f.run_id;
      SELECT code INTO v_camp_code FROM docs.test_campaigns WHERE id_campaign = v_f.campaign_id;
      v_feature := coalesce(nullif(p_payload->>'featureId','')::uuid, v_feature);
      v_prio := coalesce(nullif(p_payload->>'issuePriority',''),
        CASE v_sev WHEN 'BLOCKER' THEN 'P0' WHEN 'CRITICAL' THEN 'P1' WHEN 'MAJOR' THEN 'P2'
                   WHEN 'MINOR' THEN 'P3' WHEN 'TRIVIAL' THEN 'P4' ELSE 'P3' END);
      v_itype := CASE v_f.finding_type WHEN 'BUG' THEN 'BUG' WHEN 'QUESTION' THEN 'QUESTION' ELSE 'IMPROVEMENT' END;
      v_desc := v_f.description_md
        || E'\n\n---\n_Source : retour de test ' || v_f.code || ' (campagne ' || coalesce(v_camp_code,'?')
        || CASE WHEN v_scn_code IS NOT NULL THEN ', scénario ' || v_scn_code ELSE '' END || ')_';

      v_res := admin.docs_issue_create(
        p_admin_id, v_itype, v_f.title, v_desc,
        CASE WHEN v_itype = 'BUG' THEN v_sev END, v_prio, v_feature, v_module,
        v_f.reproduction_steps, v_f.environment, NULL, NULL, NULL, ARRAY['test-validation']);
      v_issue := (v_res->'issue'->>'id_issue')::uuid;

      UPDATE docs.issues SET
        expected_behavior = v_f.expected_behavior,
        actual_behavior   = v_f.actual_behavior,
        attachments       = CASE WHEN jsonb_array_length(v_f.attachments) > 0 THEN v_f.attachments ELSE attachments END
      WHERE id_issue = v_issue;
    END IF;
  END IF;

  UPDATE docs.test_findings SET
    status      = v_new_status,
    severity    = CASE WHEN p_decision = 'CONFIRM' THEN v_sev ELSE severity END,
    issue_id    = CASE WHEN p_decision = 'CONFIRM' THEN v_issue ELSE issue_id END,
    triage_note = CASE WHEN p_decision = 'REOPEN' THEN triage_note ELSE coalesce(v_note, triage_note) END,
    triaged_by  = CASE WHEN p_decision = 'REOPEN' THEN NULL ELSE v_actor END,
    triaged_at  = CASE WHEN p_decision = 'REOPEN' THEN NULL ELSE now() END
  WHERE id_finding = p_finding_id;

  PERFORM admin.docs_log_activity(v_actor, 'TEST_FINDING', p_finding_id, 'TRIAGED',
    jsonb_build_object('status', v_f.status),
    jsonb_build_object('decision', p_decision, 'newStatus', v_new_status, 'severity', v_sev,
                       'issueId', v_issue, 'note', v_note));
  RETURN admin._tests_finding_json(p_finding_id);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_test_finding_comment(p_admin_id uuid, p_finding_id uuid, p_content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  IF btrim(coalesce(p_content,'')) = '' THEN RAISE EXCEPTION 'Message vide' USING ERRCODE = '22000'; END IF;
  IF length(p_content) > 5000 THEN RAISE EXCEPTION 'Message trop long (5000 caractères max)' USING ERRCODE = '22000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM docs.test_findings WHERE id_finding = p_finding_id) THEN
    RAISE EXCEPTION 'Retour introuvable' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO docs.test_finding_comments (finding_id, author_kind, author_user_id, content_md)
  VALUES (p_finding_id, 'ADMIN', v_actor, btrim(p_content));
  RETURN admin._tests_finding_json(p_finding_id);
END $fn$;

-- Demande de re-test après correction : marque le retour et crée une nouvelle tentative
CREATE OR REPLACE FUNCTION admin.docs_test_finding_request_retest(p_admin_id uuid, p_finding_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_actor uuid; v_f docs.test_findings%ROWTYPE; v_run jsonb;
BEGIN
  v_actor := admin.docs_tests_assert(p_admin_id, 'write');
  SELECT * INTO v_f FROM docs.test_findings WHERE id_finding = p_finding_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour introuvable' USING ERRCODE = 'P0002'; END IF;
  IF v_f.run_id IS NULL THEN
    RAISE EXCEPTION 'Ce retour n''est rattaché à aucune exécution : re-test impossible' USING ERRCODE = '22023';
  END IF;
  v_run := admin.docs_test_run_request_retest(p_admin_id, v_f.run_id,
             coalesce(p_note, 'Re-test après correction de ' || v_f.code));
  UPDATE docs.test_findings SET retest_requested_at = now() WHERE id_finding = p_finding_id;
  RETURN jsonb_build_object('run', v_run, 'finding', admin._tests_finding_json(p_finding_id));
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 14. VUE D'ENSEMBLE D'UNE CAMPAGNE
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin.docs_test_campaign_overview(p_admin_id uuid, p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $fn$
DECLARE v_c jsonb;
BEGIN
  PERFORM admin.docs_tests_assert(p_admin_id, 'read');
  v_c := admin._tests_campaign_json(p_campaign_id);
  IF v_c IS NULL THEN RAISE EXCEPTION 'Campagne introuvable' USING ERRCODE = 'P0002'; END IF;

  RETURN v_c || jsonb_build_object(
    'readiness', admin._tests_readiness(p_campaign_id),

    -- Avancement par module
    'byModule', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'module', m.module, 'scenarios', m.n, 'executed', m.executed, 'passed', m.passed) ORDER BY m.module)
      FROM (
        SELECT coalesce(s.module, '—') AS module, count(*) AS n,
               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM admin._tests_latest_runs(p_campaign_id) lr
                                  WHERE lr.scenario_id = s.id_scenario AND lr.status IN ('PASSED','FAILED','BLOCKED'))) AS executed,
               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM admin._tests_latest_runs(p_campaign_id) lr
                                  WHERE lr.scenario_id = s.id_scenario AND lr.status = 'PASSED')
                                  AND NOT EXISTS (SELECT 1 FROM admin._tests_latest_runs(p_campaign_id) lr
                                  WHERE lr.scenario_id = s.id_scenario AND lr.status IN ('FAILED','BLOCKED'))) AS passed
          FROM docs.test_campaign_scenarios cs JOIN docs.test_scenarios s ON s.id_scenario = cs.scenario_id
         WHERE cs.campaign_id = p_campaign_id GROUP BY coalesce(s.module, '—')) m), '[]'::jsonb),

    -- Par plateforme (testeurs et dernières exécutions)
    'byPlatform', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'platform', p.platform, 'testers', p.testers, 'runsDone', p.done, 'runsFailed', p.failed))
      FROM (
        SELECT coalesce(t.platform, 'INCONNU') AS platform, count(DISTINCT t.id_tester) AS testers,
               count(r.id_run) FILTER (WHERE r.status IN ('PASSED','FAILED','BLOCKED')) AS done,
               count(r.id_run) FILTER (WHERE r.status IN ('FAILED','BLOCKED')) AS failed
          FROM docs.test_testers t LEFT JOIN docs.test_runs r ON r.tester_id = t.id_tester
         WHERE t.campaign_id = p_campaign_id AND t.status <> 'REMOVED' GROUP BY coalesce(t.platform, 'INCONNU')) p), '[]'::jsonb),

    -- Activité des 30 derniers jours
    'timeline', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', d.day, 'runs', d.runs, 'findings', d.findings) ORDER BY d.day)
      FROM (
        SELECT g.day::date AS day,
               (SELECT count(*) FROM docs.test_runs r WHERE r.campaign_id = p_campaign_id
                   AND r.finished_at >= g.day AND r.finished_at < g.day + interval '1 day') AS runs,
               (SELECT count(*) FROM docs.test_findings f WHERE f.campaign_id = p_campaign_id
                   AND f.created_at >= g.day AND f.created_at < g.day + interval '1 day') AS findings
          FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') g(day)) d), '[]'::jsonb),

    -- Testeurs : inscrits mais jamais actifs, exécutions jamais démarrées
    'attention', jsonb_build_object(
      'untriaged',     (SELECT count(*) FROM docs.test_findings WHERE campaign_id = p_campaign_id AND status = 'NEW'),
      'needInfo',      (SELECT count(*) FROM docs.test_findings WHERE campaign_id = p_campaign_id AND status = 'NEED_INFO'),
      'testersNotJoined', (SELECT count(*) FROM docs.test_testers WHERE campaign_id = p_campaign_id AND status = 'INVITED'),
      'runsNotStarted',   (SELECT count(*) FROM docs.test_runs WHERE campaign_id = p_campaign_id AND status = 'ASSIGNED'),
      'pendingRetest', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'id_finding', f.id_finding, 'code', f.code, 'title', f.title, 'issueCode', i.code, 'issueStatus', i.status))
          FROM docs.test_findings f JOIN docs.issues i ON i.id_issue = f.issue_id
         WHERE f.campaign_id = p_campaign_id AND f.run_id IS NOT NULL AND f.retest_requested_at IS NULL
           AND i.status IN ('FIXED','VERIFIED')), '[]'::jsonb)),

    -- Classement des testeurs
    'topTesters', COALESCE((SELECT jsonb_agg(x.j ORDER BY x.done DESC, x.findings DESC) FROM (
        SELECT jsonb_build_object('id_tester', t.id_tester, 'email', t.email, 'fullName', t.full_name,
                 'runsDone', count(DISTINCT r.id_run) FILTER (WHERE r.status IN ('PASSED','FAILED','BLOCKED','SKIPPED')),
                 'runsTotal', count(DISTINCT r.id_run),
                 'findings', (SELECT count(*) FROM docs.test_findings f WHERE f.tester_id = t.id_tester)) AS j,
               count(DISTINCT r.id_run) FILTER (WHERE r.status IN ('PASSED','FAILED','BLOCKED','SKIPPED')) AS done,
               (SELECT count(*) FROM docs.test_findings f WHERE f.tester_id = t.id_tester) AS findings
          FROM docs.test_testers t LEFT JOIN docs.test_runs r ON r.tester_id = t.id_tester
         WHERE t.campaign_id = p_campaign_id AND t.status <> 'REMOVED'
         GROUP BY t.id_tester, t.email, t.full_name
         LIMIT 10) x), '[]'::jsonb)
  );
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════
-- 15. DROITS D'EXÉCUTION
--   • API publique du module (admin.docs_test_*) : authenticated + service_role
--   • helpers internes (admin._tests_*, docs_tests_assert) : aucun accès direct
--   • anon : jamais
-- ═══════════════════════════════════════════════════════════════════════
DO $grants$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'admin' AND (p.proname LIKE 'docs\_test\_%' OR p.proname LIKE '\_tests\_%' OR p.proname = 'docs_tests_assert')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    IF r.proname LIKE 'docs\_test\_%' AND r.proname <> 'docs_tests_assert' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END
$grants$;

NOTIFY pgrst, 'reload schema';

COMMIT;
