/**
 * Query keys du module docs.
 * Toutes les clés passent par `docsKeys` pour garantir :
 *  - cohérence d'invalidation (`invalidateQueries({ queryKey: docsKeys.features.all() })`)
 *  - stabilité (normalisation des filtres vides/nuls)
 */

/**
 * Normalise un objet d'arguments :
 *  - retire les clés null/undefined/''
 *  - trie les clés pour un ordre déterministe
 * But : { p_status: null } et {} produisent la MÊME clé.
 */
export const normalizeArgs = (args = {}) => {
  const out = {}
  Object.keys(args)
    .sort()
    .forEach((k) => {
      const v = args[k]
      if (v === null || v === undefined || v === '') return
      if (Array.isArray(v) && v.length === 0) return
      out[k] = v
    })
  return out
}

const root = ['docs']

export const docsKeys = {
  all: () => root,

  // ── Dashboard / agrégats ──
  dashboard:       () => [...root, 'dashboard'],
  moduleHealth:    (module) => [...root, 'module-health', normalizeArgs({ module })],
  activity:        (limit) => [...root, 'activity', normalizeArgs({ limit })],
  search:          (q, limit) => [...root, 'search', normalizeArgs({ q, limit })],

  // ── Features ──
  features: {
    all:      () => [...root, 'features'],
    list:     (f = {}) => [...root, 'features', 'list', normalizeArgs(f)],
    detail:   (ref) => [...root, 'features', 'detail', ref],
    search:   (q, limit) => [...root, 'features', 'search', normalizeArgs({ q, limit })],
    tree:     (rootId) => [...root, 'features', 'tree', normalizeArgs({ rootId })],
  },

  // ── Pages (documentation) ──
  pages: {
    all:      () => [...root, 'pages'],
    list:     (f = {}) => [...root, 'pages', 'list', normalizeArgs(f)],
    detail:   (ref) => [...root, 'pages', 'detail', ref],
    search:   (q, limit) => [...root, 'pages', 'search', normalizeArgs({ q, limit })],
    versions: (pageId) => [...root, 'pages', 'versions', pageId],
  },

  // ── Issues ──
  issues: {
    all:      () => [...root, 'issues'],
    list:     (f = {}) => [...root, 'issues', 'list', normalizeArgs(f)],
    detail:   (ref) => [...root, 'issues', 'detail', ref],
  },

  // ── Releases ──
  releases: {
    all:       () => [...root, 'releases'],
    list:      (f = {}) => [...root, 'releases', 'list', normalizeArgs(f)],
    detail:    (ref) => [...root, 'releases', 'detail', ref],
    progress:  (id) => [...root, 'releases', 'progress', id],
    readiness: (id) => [...root, 'releases', 'readiness', id],
  },

  // ── ADRs ──
  adrs: {
    all:   () => [...root, 'adrs'],
    list:  (f = {}) => [...root, 'adrs', 'list', normalizeArgs(f)],
    detail:(id) => [...root, 'adrs', 'detail', id],
  },

  // ── Runbooks ──
  runbooks: {
    all:   () => [...root, 'runbooks'],
    list:  (f = {}) => [...root, 'runbooks', 'list', normalizeArgs(f)],
    detail:(id) => [...root, 'runbooks', 'detail', id],
  },

  // ── Glossaire ──
  glossary: {
    all:  () => [...root, 'glossary'],
    list: (f = {}) => [...root, 'glossary', 'list', normalizeArgs(f)],
  },

  // ── Annexes ──
  templates: () => [...root, 'checklist-templates'],
  tags: {
    forEntity: (type, id) => [...root, 'tags', normalizeArgs({ type, id })],
    all:       () => [...root, 'tags', 'all'],
  },
  entityReferences: {
    forSource: (type, id) => [...root, 'references', normalizeArgs({ type, id })],
  },
}