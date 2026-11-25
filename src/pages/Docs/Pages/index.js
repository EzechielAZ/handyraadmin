// `./index` se résolvait sur CE fichier → on cible explicitement `./index.jsx`.
export { default }                       from './index.jsx'
export { default as PagesPage }          from './index.jsx'
export { default as PageDetailPage }     from './PageDetail'
export { PageDrawer }                    from './PageDrawer'