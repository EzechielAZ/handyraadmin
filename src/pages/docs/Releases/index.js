// Barrel Releases. `./index` pointerait sur CE fichier (résolution ambiguë
// avec index.jsx) → on cible explicitement `./index.jsx`.
export { default }                       from './index.jsx'
export { default as ReleasesPage }       from './index.jsx'
export { default as ReleaseDetailPage }  from './ReleaseDetail'
export { ReleaseDrawer }                 from './ReleaseDrawer'
export { ReleaseReadinessDialog }        from './ReleaseReadinessDialog'