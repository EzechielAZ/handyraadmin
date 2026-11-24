/* Libellés KYC partagés (ArtisanDetail + KycReviewDrawer) */
export const DOC_TYPE_LABEL = {
  IDENTITY_FRONT: "Pièce d'identité (recto)",
  IDENTITY_BACK: "Pièce d'identité (verso)",
  SELFIE_WITH_ID: 'Selfie avec pièce',
  IFU_DOCUMENT: 'Document IFU',
}
export const ID_DOC_LABEL = { CIP: 'CIP', CIN: 'CIN', PASSPORT: 'Passeport' }
/* Codes = contrainte CHECK de kyc_submissions.rejection_code */
export const REJECTION_LABEL = {
  DOCUMENT_BLURRY: 'Document flou',
  DOCUMENT_EXPIRED: 'Document expiré',
  DOCUMENT_MISMATCH: 'Document non conforme',
  IFU_MISMATCH: 'IFU non conforme',
  SELFIE_INVALID: 'Selfie invalide',
  INCOMPLETE_DOSSIER: 'Dossier incomplet',
  FRAUD_SUSPECTED: 'Fraude suspectée',
  OTHER: 'Autre',
}