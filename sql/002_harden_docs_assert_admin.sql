-- ═══════════════════════════════════════════════════════════════════════
--  002 — Correctif sécurité : docs_assert_admin lié à la session
--
--  Problème : admin.docs_assert_admin(p_admin_id, ...) acceptait n'importe quel
--  UUID d'admin sans vérifier qu'il correspond à l'utilisateur connecté.
--  Tout compte authentifié connaissant l'UUID d'un admin pouvait appeler les
--  fonctions admin.docs_* en son nom.
--
--  Correctif : si un JWT utilisateur est présent (auth.uid() non nul), le compte
--  public.users résolu doit avoir auth_id = auth.uid(). Sans JWT (SQL Editor,
--  jobs, service_role) le comportement est inchangé.
--
--  Le corps est identique à l'existant, plus le bloc « liaison à la session ».
--  Idempotent. Rollback : rejouer l'ancienne définition (sans le bloc marqué).
--  NB : ne couvre que les fonctions qui passent par docs_assert_admin ; les
--  autres fonctions admin.* (hors module docs) sont à auditer séparément.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION admin.docs_assert_admin(p_admin_id uuid, p_domain text DEFAULT NULL::text, p_action text DEFAULT 'read'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'admin', 'docs', 'pg_temp'
AS $function$
DECLARE v_public_user_id uuid; v_role text; v_uid uuid;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Session invalide' USING ERRCODE = '28000';
  END IF;

  SELECT au.user_id, ar.role_name
    INTO v_public_user_id, v_role
    FROM admin.users au
    JOIN admin.roles ar ON ar.id_role = au.role_id
   WHERE (au.id_admin_user = p_admin_id OR au.user_id = p_admin_id)
     AND au.is_active = true
     AND (au.expires_at IS NULL OR au.expires_at > now())
   LIMIT 1;

  IF v_public_user_id IS NULL THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;

  -- ── Liaison à la session (correctif) ──
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;
  IF v_uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id_user = v_public_user_id AND u.auth_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Session non autorisée pour cet administrateur' USING ERRCODE = '42501';
  END IF;
  -- ── fin du correctif ──

  IF p_domain IS NOT NULL AND v_role NOT IN ('SUPER_ADMIN','ADMIN') THEN
    IF p_action NOT IN ('read','write','manage') THEN
      RAISE EXCEPTION 'Action invalide: %', p_action USING ERRCODE = '22000';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM admin.docs_permissions
       WHERE role_name = v_role
         AND (domain = p_domain OR domain = 'all')
         AND (
              action = 'manage'
           OR (action = 'write' AND p_action IN ('read','write'))
           OR (action = 'read'  AND p_action = 'read')
         )
    ) THEN
      RAISE EXCEPTION 'Vous n''avez pas la permission % sur %', p_action, p_domain
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN v_public_user_id;
END $function$;

COMMIT;
