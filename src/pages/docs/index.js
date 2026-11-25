// pages/Docs/index.js
//
// Agrégateur des exports du module Documentation.
// - Barrel (Releases/, Features/, Issues/, Pages/, Adrs/, Runbooks/, Glossary/)
//   → export NOMMÉ (ex. `ReleasesPage`), pas de default.
// - Fichier direct (Dashboard.jsx, Activity.jsx, *Detail.jsx)
//   → `export default`, donc ré-export via `default as`.

// ─── Fichiers directs (default export) ───
export { default as DocsDashboard }     from './Dashboard'
export { default as ActivityPage }      from './Activity'
export { default as FeatureDetailPage } from './Features/FeatureDetail'
export { default as ReleaseDetailPage } from './Releases/ReleaseDetail'
export { default as IssueDetailPage }   from './Issues/IssueDetail'
export { default as PageDetailPage }    from './Pages/PageDetail'
export { default as AdrDetailPage }     from './Adrs/AdrDetail'

// ─── Barrels (export nommé) ───
export { FeaturesPage } from './Features'
export { ReleasesPage } from './Releases'
export { IssuesPage }   from './Issues'
export { PagesPage }    from './Pages'
export { AdrsPage }     from './Adrs'
export { RunbooksPage } from './Runbooks'
export { GlossaryPage } from './Glossary'