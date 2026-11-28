-- ═══════════════════════════════════════════════════════════════════════
--  006 — Référentiel des modules (source unique : Features, Issues, Scénarios, assistant IA)
--  Pré-requis : 002.  Rollback : DROP FUNCTION admin.docs_module_list(uuid), admin.docs_module_create(uuid,text,text); DROP TABLE docs.modules;
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS docs.modules (
  code       varchar(40) PRIMARY KEY CHECK (code ~ '^[A-Z0-9_]{2,40}$'),
  label      varchar(80) NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE docs.modules ENABLE ROW LEVEL SECURITY;

INSERT INTO docs.modules (code, label, sort_order)
SELECT m, initcap(lower(m)), 10 * n FROM unnest(ARRAY[
  'MISSIONS','PAYMENT','CHAT','HPO','KYC','ADMIN','AUTH','NOTIFICATIONS','PROJECTS','ARTISANS','USERS',
  'SEARCH','WALLET','INVOICES','QUOTES','SUBSCRIPTIONS','REPORTS']) WITH ORDINALITY AS t(m, n)
ON CONFLICT (code) DO NOTHING;

-- Corrige les anciennes variantes et rattrape les modules déjà utilisés par les features
UPDATE docs.test_scenarios SET module = 'PAYMENT' WHERE module IN ('PAIEMENT','PAYEMENT','PAYMENTS');
INSERT INTO docs.modules (code, label)
SELECT DISTINCT upper(module), initcap(lower(module)) FROM docs.features
 WHERE module ~ '^[A-Za-z0-9_]{2,40}$' ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION admin.docs_module_list(p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp'
AS $fn$
BEGIN
  PERFORM admin.docs_assert_admin(p_admin_id, NULL, 'read');
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('code', code, 'label', label) ORDER BY sort_order, code)
                     FROM docs.modules WHERE is_active), '[]'::jsonb);
END $fn$;

CREATE OR REPLACE FUNCTION admin.docs_module_create(p_admin_id uuid, p_code text, p_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','admin','docs','pg_temp'
AS $fn$
DECLARE v_code text := upper(btrim(coalesce(p_code,'')));
BEGIN
  PERFORM admin.docs_assert_admin(p_admin_id, NULL, 'write');
  IF v_code !~ '^[A-Z0-9_]{2,40}$' THEN
    RAISE EXCEPTION 'Code de module invalide (lettres, chiffres, _ ; 2 à 40 caractères)' USING ERRCODE = '22000';
  END IF;
  INSERT INTO docs.modules (code, label, sort_order)
  VALUES (v_code, coalesce(nullif(btrim(p_label),''), initcap(lower(v_code))), 1000)
  ON CONFLICT (code) DO UPDATE SET is_active = true;
  RETURN jsonb_build_object('code', v_code);
END $fn$;

GRANT EXECUTE ON FUNCTION admin.docs_module_list(uuid), admin.docs_module_create(uuid,text,text) TO authenticated, service_role;
COMMIT;
