-- ═══════════════════════════════════════════════════════════════════════
--  007 — Portail testeur : accès anonyme sans ouvrir le schéma `admin`
--  Problème : un testeur sans session (rôle anon) reçoit « permission denied for schema admin ».
--  Solution : de fines fonctions publiques `public.portal_*` (SECURITY DEFINER) qui appellent
--  admin.portal_*. Le schéma `admin` reste fermé à anon (ne PAS lui accorder USAGE : cela
--  exposerait les autres fonctions d'administration).
--  Pré-requis : 003, 004.  Rollback : DROP FUNCTION public.portal_open(text,jsonb), … (voir ci-dessous).
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION public.portal_open(p_token text, p_device jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_open(p_token, p_device) $$;

CREATE OR REPLACE FUNCTION public.portal_run_get(p_token text, p_run_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_run_get(p_token, p_run_id) $$;

CREATE OR REPLACE FUNCTION public.portal_run_record(p_token text, p_run_id uuid, p_status text, p_note text DEFAULT NULL, p_steps jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_run_record(p_token, p_run_id, p_status, p_note, p_steps) $$;

CREATE OR REPLACE FUNCTION public.portal_finding_create(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_finding_create(p_token, p_payload) $$;

CREATE OR REPLACE FUNCTION public.portal_finding_get(p_token text, p_ref text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_finding_get(p_token, p_ref) $$;

CREATE OR REPLACE FUNCTION public.portal_finding_comment(p_token text, p_ref text, p_content text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_finding_comment(p_token, p_ref, p_content) $$;

CREATE OR REPLACE FUNCTION public.portal_finding_attach(p_token text, p_ref text, p_items jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'admin','public','pg_temp'
AS $$ SELECT admin.portal_finding_attach(p_token, p_ref, p_items) $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.portal_open(text,jsonb)', 'public.portal_run_get(text,uuid)',
    'public.portal_run_record(text,uuid,text,text,jsonb)', 'public.portal_finding_create(text,jsonb)',
    'public.portal_finding_get(text,text)', 'public.portal_finding_comment(text,text,text)',
    'public.portal_finding_attach(text,text,jsonb)']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
