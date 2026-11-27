-- Annulation du module « Tests de validation » (migration 001).
-- ⚠ Supprime TOUTES les données des campagnes, testeurs, exécutions et retours.
-- Les issues créées depuis des retours sont conservées (le lien est perdu).
BEGIN;

DO $rb$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'admin'
       AND (p.proname LIKE 'docs\_test\_%' OR p.proname LIKE '\_tests\_%' OR p.proname = 'docs_tests_assert')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END
$rb$;

DROP TABLE IF EXISTS docs.test_finding_comments, docs.test_findings, docs.test_run_steps, docs.test_runs,
                     docs.test_testers, docs.test_campaign_scenarios, docs.test_campaigns,
                     docs.test_scenario_steps, docs.test_scenarios CASCADE;

DELETE FROM docs.activity_log WHERE entity_type LIKE 'TEST\_%';
DELETE FROM admin.docs_permissions WHERE domain = 'tests';

ALTER TABLE docs.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE docs.activity_log ADD CONSTRAINT activity_log_entity_type_check CHECK (
  entity_type::text = ANY (ARRAY[
    'FEATURE','PAGE','ISSUE','RELEASE','RELEASE_FEATURE','RELEASE_OBJECTIVE',
    'CHECKLIST_ITEM','SIGNOFF','ADR','RUNBOOK','GLOSSARY','TAG','COMMENT','CHANGELOG_ENTRY'
  ]::text[])
);

NOTIFY pgrst, 'reload schema';
COMMIT;
