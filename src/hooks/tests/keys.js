/**
 * Query keys du module Tests de validation.
 * Racine unique ['tests'] : après n'importe quelle mutation on peut tout invalider,
 * car la préparation (go/no-go), les matrices et les listes dépendent les unes des autres.
 */
import { normalizeArgs } from '../docs/keys'

const root = ['tests']

export const testsKeys = {
  all: () => root,

  scenarios: {
    all:    () => [...root, 'scenarios'],
    list:   (f = {}) => [...root, 'scenarios', 'list', normalizeArgs(f)],
    detail: (ref) => [...root, 'scenarios', 'detail', ref],
  },

  campaigns: {
    all:       () => [...root, 'campaigns'],
    list:      (f = {}) => [...root, 'campaigns', 'list', normalizeArgs(f)],
    detail:    (ref) => [...root, 'campaigns', 'detail', ref],
    overview:  (id) => [...root, 'campaigns', 'overview', id],
    readiness: (id) => [...root, 'campaigns', 'readiness', id],
  },

  testers: {
    all:  () => [...root, 'testers'],
    list: (campaignId, f = {}) => [...root, 'testers', 'list', campaignId, normalizeArgs(f)],
  },

  runs: {
    all:    () => [...root, 'runs'],
    list:   (campaignId, f = {}) => [...root, 'runs', 'list', campaignId, normalizeArgs(f)],
    matrix: (campaignId) => [...root, 'runs', 'matrix', campaignId],
    detail: (id) => [...root, 'runs', 'detail', id],
  },

  findings: {
    all:    () => [...root, 'findings'],
    list:   (f = {}) => [...root, 'findings', 'list', normalizeArgs(f)],
    detail: (ref) => [...root, 'findings', 'detail', ref],
  },
}
