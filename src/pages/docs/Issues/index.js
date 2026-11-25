// `./index` se résolvait sur CE fichier → on cible explicitement `./index.jsx`.
export { default }                       from './index.jsx'
export { default as IssuesPage }         from './index.jsx'
export { default as IssueDetailPage }    from './IssueDetail'
export { IssueDrawer }                   from './IssueDrawer'