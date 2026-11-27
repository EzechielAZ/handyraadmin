/**
 * PACK DE DÉMARRAGE — scénarios de test pour une marketplace mobile artisans / clients.
 *
 * ⚠ POINT DE DÉPART À ADAPTER : ces scénarios sont volontairement génériques.
 * Relisez chaque scénario avec l'app 1.0.0 en main : ajustez les libellés d'écrans,
 * supprimez ce qui n'existe pas encore et complétez les données de test.
 *
 * Les `code` sont stables (STARTER-…) : réimporter le pack est sans danger,
 * un code déjà présent est ignoré par le serveur (import idempotent).
 */

const s = (actionMd, expectedMd) => ({ actionMd, expectedMd })

const base = (code, o) => ({
  code: `STARTER-${code}`,
  status: 'READY',
  scenarioType: 'FUNCTIONAL',
  tags: ['starter'],
  ...o,
})

export const STARTER_PACK = [
  // ─── AUTH ───
  base('AUTH-01', {
    title: 'Inscription d’un client par code e-mail (OTP)',
    summary: 'Un nouveau client crée son compte avec un code à 6 chiffres reçu par e-mail.',
    module: 'AUTH', profile: 'CLIENT', priority: 'P0', scenarioType: 'SMOKE', estimatedMinutes: 6,
    preconditionsMd: '- App installée, jamais connectée\n- Connexion Internet active\n- Une adresse e-mail de test accessible',
    testDataMd: '- E-mail : `testeur+client01@exemple.test`',
    steps: [
      s('Ouvrir l’app pour la première fois.', 'L’écran d’accueil / de choix de profil s’affiche sans erreur.'),
      s('Choisir le profil **Client**.', 'Le parcours d’inscription client démarre.'),
      s('Saisir l’e-mail de test et valider.', 'Un écran de saisie du code à 6 chiffres s’affiche.'),
      s('Ouvrir la boîte mail et relever le code reçu.', 'Le code est reçu en moins de 2 minutes.'),
      s('Saisir le code dans les 6 cases.', 'Le compte est créé et l’accueil client s’affiche.'),
    ],
  }),
  base('AUTH-02', {
    title: 'Inscription d’un artisan',
    summary: 'Un artisan crée son compte et accède à son espace.',
    module: 'AUTH', profile: 'ARTISAN', priority: 'P0', scenarioType: 'SMOKE', estimatedMinutes: 8,
    preconditionsMd: '- App installée, jamais connectée\n- Une adresse e-mail de test accessible',
    testDataMd: '- E-mail : `testeur+artisan01@exemple.test`',
    steps: [
      s('Ouvrir l’app et choisir le profil **Artisan**.', 'Le parcours d’inscription artisan démarre.'),
      s('Saisir l’e-mail de test et valider.', 'L’écran de saisie du code s’affiche.'),
      s('Saisir le code reçu par e-mail.', 'Le compte est créé.'),
      s('Compléter les informations demandées (nom, métier, zone).', 'Les informations sont enregistrées sans erreur.'),
      s('Arriver sur l’accueil artisan.', 'L’espace artisan s’affiche avec le bon profil.'),
    ],
  }),
  base('AUTH-03', {
    title: 'Code OTP erroné puis renvoi du code',
    summary: 'Le comportement face à un mauvais code et au renvoi (délai d’attente).',
    module: 'AUTH', profile: 'ANY', priority: 'P1', estimatedMinutes: 5,
    preconditionsMd: '- Être sur l’écran de saisie du code',
    steps: [
      s('Saisir volontairement un code incorrect.', 'Un message d’erreur clair s’affiche et la saisie peut être refaite.'),
      s('Tenter immédiatement de renvoyer un code.', 'Le renvoi est bloqué pendant un délai affiché (compte à rebours).'),
      s('Attendre la fin du délai puis renvoyer un code.', 'Un nouveau code est reçu par e-mail.'),
      s('Saisir le nouveau code.', 'La connexion aboutit.'),
    ],
  }),
  base('AUTH-04', {
    title: 'Reconnexion d’un compte existant',
    summary: 'Un utilisateur déjà inscrit se reconnecte après déconnexion.',
    module: 'AUTH', profile: 'ANY', priority: 'P0', scenarioType: 'SMOKE', estimatedMinutes: 4,
    preconditionsMd: '- Compte existant\n- Session fermée (déconnexion effectuée)',
    steps: [
      s('Se déconnecter depuis le profil.', 'Retour à l’écran d’accueil / connexion.'),
      s('Saisir l’e-mail du compte existant.', 'L’app reconnaît le compte et envoie un code.'),
      s('Saisir le code reçu.', 'L’utilisateur retrouve son espace avec ses données.'),
    ],
  }),
  base('AUTH-05', {
    title: 'Session conservée après fermeture complète de l’app',
    summary: 'L’utilisateur n’a pas à se reconnecter à chaque ouverture.',
    module: 'AUTH', profile: 'ANY', priority: 'P1', estimatedMinutes: 3,
    preconditionsMd: '- Utilisateur connecté',
    steps: [
      s('Fermer complètement l’app (retirer des applications récentes).', 'L’app est fermée.'),
      s('Relancer l’app.', 'L’utilisateur est toujours connecté, sans nouvelle saisie.'),
      s('Ouvrir un écran de données (missions ou profil).', 'Les données se chargent normalement.'),
    ],
  }),
  base('AUTH-06', {
    title: 'Suppression de compte',
    summary: 'L’utilisateur supprime son compte depuis l’app.',
    module: 'USERS', profile: 'ANY', priority: 'P1', estimatedMinutes: 5,
    preconditionsMd: '- Compte de test **jetable** (ne pas utiliser un compte utile)',
    steps: [
      s('Ouvrir le profil puis la section de gestion du compte.', 'L’option de suppression de compte est accessible.'),
      s('Lancer la suppression.', 'Une confirmation explicite est demandée avant toute action.'),
      s('Confirmer.', 'L’utilisateur est déconnecté et un message de confirmation s’affiche.'),
      s('Tenter de se reconnecter avec le même e-mail.', 'Le compte n’est plus utilisable avec ses anciennes données.'),
    ],
  }),

  // ─── MISSIONS ───
  base('MISSIONS-01', {
    title: 'Publier une mission avec photos',
    summary: 'Un client décrit un besoin, joint des photos et publie la mission.',
    module: 'MISSIONS', profile: 'CLIENT', priority: 'P0', estimatedMinutes: 8,
    preconditionsMd: '- Client connecté\n- 2 photos de test dans la galerie du téléphone',
    testDataMd: '- Titre : « Fuite sous évier (test) »\n- Description : 2-3 phrases libres',
    steps: [
      s('Démarrer la création d’une nouvelle mission.', 'Le formulaire de mission s’affiche.'),
      s('Choisir une catégorie de service.', 'La catégorie est sélectionnée.'),
      s('Saisir un titre et une description.', 'Les champs acceptent la saisie, les champs obligatoires sont signalés.'),
      s('Ajouter deux photos depuis la galerie.', 'Les photos apparaissent en aperçu.'),
      s('Renseigner la localisation / zone.', 'La localisation est enregistrée.'),
      s('Publier la mission.', 'Un message de succès s’affiche et la mission apparaît dans la liste du client.'),
    ],
  }),
  base('MISSIONS-02', {
    title: 'Formulaire de mission : validations des champs obligatoires',
    summary: 'Aucune mission incomplète ne doit pouvoir être publiée.',
    module: 'MISSIONS', profile: 'CLIENT', priority: 'P2', estimatedMinutes: 4,
    preconditionsMd: '- Client connecté',
    steps: [
      s('Ouvrir le formulaire de mission et valider sans rien remplir.', 'Les champs obligatoires sont mis en évidence avec un message.'),
      s('Remplir uniquement le titre puis valider.', 'Les autres champs obligatoires restent signalés.'),
      s('Compléter tous les champs obligatoires.', 'La publication devient possible.'),
    ],
  }),
  base('MISSIONS-03', {
    title: 'Un artisan voit et consulte une mission disponible',
    summary: 'Une mission publiée est visible par les artisans concernés.',
    module: 'MISSIONS', profile: 'ARTISAN', priority: 'P0', estimatedMinutes: 5,
    preconditionsMd: '- Une mission vient d’être publiée par un client de test\n- Artisan connecté, métier / zone cohérents avec la mission',
    steps: [
      s('Ouvrir la liste des missions disponibles.', 'La mission publiée est visible.'),
      s('Ouvrir le détail de la mission.', 'Titre, description, photos et localisation sont affichés correctement.'),
      s('Revenir à la liste.', 'La navigation retour fonctionne sans perte de position.'),
    ],
  }),
  base('MISSIONS-04', {
    title: 'Cycle de vie : acceptation puis réalisation d’une mission',
    summary: 'Parcours complet client ↔ artisan, de l’acceptation à la clôture.',
    module: 'MISSIONS', profile: 'ANY', priority: 'P0', scenarioType: 'REGRESSION', estimatedMinutes: 15,
    preconditionsMd: '- Deux appareils (ou deux sessions) : un client et un artisan de test\n- Une mission publiée',
    steps: [
      s('Côté artisan : accepter / se positionner sur la mission.', 'Le statut de la mission change et l’artisan la retrouve dans « mes missions ».'),
      s('Côté client : constater la mise à jour.', 'Le client voit l’artisan affecté et le nouveau statut.'),
      s('Côté artisan : faire avancer la mission (démarrage, fin).', 'Chaque changement de statut est visible des deux côtés.'),
      s('Côté client : valider la fin de mission.', 'La mission passe à l’état terminé.'),
    ],
  }),
  base('MISSIONS-05', {
    title: 'Annulation d’une mission par le client',
    summary: 'Le client annule une mission non démarrée.',
    module: 'MISSIONS', profile: 'CLIENT', priority: 'P2', estimatedMinutes: 4,
    preconditionsMd: '- Une mission publiée non encore démarrée',
    steps: [
      s('Ouvrir la mission puis choisir l’annulation.', 'Une confirmation est demandée.'),
      s('Confirmer l’annulation.', 'Le statut passe à annulé.'),
      s('Côté artisan, consulter la mission.', 'Elle n’est plus proposée ou apparaît comme annulée.'),
    ],
  }),

  // ─── QUOTES ───
  base('QUOTES-01', {
    title: 'Un artisan envoie un devis, le client l’accepte',
    summary: 'Création d’un devis, réception et acceptation par le client.',
    module: 'QUOTES', profile: 'ANY', priority: 'P0', estimatedMinutes: 10,
    preconditionsMd: '- Une mission ouverte entre un client et un artisan de test',
    testDataMd: '- Montant du devis : une valeur ronde, ex. 15 000 FCFA',
    steps: [
      s('Côté artisan : ouvrir la mission et créer un devis.', 'Le formulaire de devis s’affiche.'),
      s('Saisir le montant et les détails puis envoyer.', 'Le devis est envoyé ; le montant et les frais affichés sont cohérents.'),
      s('Côté client : ouvrir le devis reçu.', 'Le détail du devis est lisible et le montant correct.'),
      s('Accepter le devis.', 'Le statut du devis et de la mission est mis à jour des deux côtés.'),
    ],
  }),
  base('QUOTES-02', {
    title: 'Un client refuse un devis',
    summary: 'Le refus est pris en compte et notifié.',
    module: 'QUOTES', profile: 'CLIENT', priority: 'P2', estimatedMinutes: 5,
    preconditionsMd: '- Un devis reçu en attente de réponse',
    steps: [
      s('Ouvrir le devis reçu.', 'Les actions d’acceptation et de refus sont visibles.'),
      s('Refuser le devis.', 'Une confirmation est demandée, puis le statut passe à refusé.'),
      s('Côté artisan : consulter la mission.', 'L’artisan voit que le devis a été refusé.'),
    ],
  }),

  // ─── PAYMENTS ───
  base('PAYMENTS-01', {
    title: 'Paiement d’une mission par Mobile Money',
    summary: 'Le client règle une mission acceptée avec un moyen de paiement mobile.',
    module: 'PAYMENTS', profile: 'CLIENT', priority: 'P0', estimatedMinutes: 10,
    preconditionsMd: '- Mission avec devis accepté\n- Compte Mobile Money de test / environnement de test du prestataire de paiement\n- ⚠ Utiliser uniquement des montants de test',
    steps: [
      s('Ouvrir la mission et lancer le paiement.', 'Le récapitulatif du montant s’affiche.'),
      s('Choisir Mobile Money et le numéro de test.', 'Le choix du moyen de paiement est pris en compte.'),
      s('Valider la demande de paiement et confirmer sur le téléphone.', 'Un état « en attente » puis « payé » s’affiche.'),
      s('Consulter la mission après paiement.', 'Le statut de paiement est cohérent des deux côtés.'),
    ],
  }),
  base('PAYMENTS-02', {
    title: 'Paiement échoué ou abandonné',
    summary: 'L’app gère proprement un paiement non abouti.',
    module: 'PAYMENTS', profile: 'CLIENT', priority: 'P1', estimatedMinutes: 6,
    preconditionsMd: '- Mission avec devis accepté, paiement non effectué',
    steps: [
      s('Lancer un paiement puis refuser / ignorer la confirmation sur le téléphone.', 'L’app affiche un échec ou une expiration compréhensible.'),
      s('Revenir à la mission.', 'La mission n’est pas marquée comme payée.'),
      s('Relancer un paiement.', 'Un nouveau paiement peut être initié sans double débit.'),
    ],
  }),
  base('PAYMENTS-03', {
    title: 'Portefeuille : consultation du solde et de l’historique',
    summary: 'Le solde et les opérations s’affichent correctement.',
    module: 'WALLET', profile: 'ANY', priority: 'P1', estimatedMinutes: 5,
    preconditionsMd: '- Compte ayant déjà au moins une opération',
    steps: [
      s('Ouvrir le portefeuille.', 'Le solde est affiché.'),
      s('Consulter l’historique des opérations.', 'Les opérations sont listées avec date, libellé et montant.'),
      s('Comparer avec une opération connue.', 'Le montant et le statut correspondent.'),
    ],
  }),
  base('PAYMENTS-04', {
    title: 'Retrait d’un artisan vers son compte mobile',
    summary: 'Un artisan retire ses gains disponibles.',
    module: 'PAYMENTS', profile: 'ARTISAN', priority: 'P1', estimatedMinutes: 8,
    preconditionsMd: '- Artisan avec un solde disponible de test',
    steps: [
      s('Ouvrir le portefeuille puis lancer un retrait.', 'Le formulaire de retrait s’affiche.'),
      s('Saisir un montant supérieur au solde.', 'Un message d’erreur empêche la demande.'),
      s('Saisir un montant valide et confirmer.', 'La demande est créée avec un statut clair.'),
      s('Consulter l’historique.', 'Le retrait apparaît et le solde est mis à jour.'),
    ],
  }),
  base('PAYMENTS-05', {
    title: 'Quittance / reçu de paiement',
    summary: 'Un reçu PDF est disponible après un paiement.',
    module: 'INVOICES', profile: 'CLIENT', priority: 'P2', estimatedMinutes: 5,
    preconditionsMd: '- Mission payée',
    steps: [
      s('Ouvrir la mission payée.', 'Une option pour obtenir le reçu est visible.'),
      s('Ouvrir / télécharger le reçu.', 'Le PDF s’ouvre sans erreur.'),
      s('Vérifier son contenu.', 'Montant, date, référence et parties concernées sont corrects et lisibles.'),
    ],
  }),

  // ─── CHAT ───
  base('CHAT-01', {
    title: 'Échange de messages entre client et artisan',
    summary: 'Envoi, réception et ordre des messages.',
    module: 'CHAT', profile: 'ANY', priority: 'P0', estimatedMinutes: 6,
    preconditionsMd: '- Un client et un artisan de test liés par une mission',
    steps: [
      s('Côté client : ouvrir la conversation avec l’artisan.', 'La conversation s’ouvre.'),
      s('Envoyer un message texte.', 'Le message apparaît immédiatement côté client.'),
      s('Côté artisan : ouvrir la conversation.', 'Le message est reçu et lisible.'),
      s('Répondre depuis l’artisan.', 'La réponse arrive côté client, dans le bon ordre.'),
    ],
  }),
  base('CHAT-02', {
    title: 'Badge de messages non lus',
    summary: 'Un indicateur signale les conversations non vues.',
    module: 'CHAT', profile: 'ANY', priority: 'P2', estimatedMinutes: 4,
    preconditionsMd: '- Deux comptes de test en conversation',
    steps: [
      s('Côté A : se placer sur un autre onglet que les messages.', 'Aucun badge n’est affiché si rien n’est en attente.'),
      s('Côté B : envoyer un message à A.', 'Un badge apparaît sur l’onglet messages de A.'),
      s('Côté A : ouvrir la conversation.', 'Le badge disparaît.'),
    ],
  }),

  // ─── NOTIFICATIONS ───
  base('NOTIF-01', {
    title: 'Réception d’une notification push',
    summary: 'Une notification arrive app en arrière-plan et ouvre le bon écran.',
    module: 'NOTIFICATIONS', profile: 'ANY', priority: 'P1', estimatedMinutes: 6,
    preconditionsMd: '- Autorisation de notifications accordée\n- Un second compte de test pour déclencher l’événement',
    steps: [
      s('Mettre l’app en arrière-plan.', 'L’app n’est plus au premier plan.'),
      s('Déclencher un événement depuis l’autre compte (ex. nouveau message).', 'Une notification s’affiche sur le téléphone.'),
      s('Toucher la notification.', 'L’app s’ouvre sur l’écran concerné.'),
    ],
  }),
  base('NOTIF-02', {
    title: 'Notifications refusées au premier lancement',
    summary: 'L’app reste utilisable si l’utilisateur refuse les notifications.',
    module: 'NOTIFICATIONS', profile: 'ANY', priority: 'P2', scenarioType: 'EXPLORATORY', estimatedMinutes: 4,
    preconditionsMd: '- App réinstallée (ou permissions réinitialisées)',
    steps: [
      s('Refuser l’autorisation de notifications quand elle est demandée.', 'L’app continue normalement.'),
      s('Utiliser l’app (navigation, chat).', 'Aucune erreur bloquante liée aux notifications.'),
    ],
  }),

  // ─── PROFIL / PERMISSIONS / ÉVALUATION ───
  base('PROFILE-01', {
    title: 'Modification du profil et de la photo',
    summary: 'L’utilisateur met à jour ses informations et sa photo.',
    module: 'USERS', profile: 'ANY', priority: 'P2', estimatedMinutes: 6,
    preconditionsMd: '- Utilisateur connecté\n- Une photo de test',
    steps: [
      s('Ouvrir le profil puis la modification.', 'Les informations actuelles sont préremplies.'),
      s('Modifier le nom et choisir une nouvelle photo.', 'La photo choisie est affichée en aperçu.'),
      s('Enregistrer.', 'Un message de succès s’affiche.'),
      s('Fermer et rouvrir l’app.', 'Les modifications sont conservées.'),
    ],
  }),
  base('PERM-01', {
    title: 'Permissions caméra et localisation',
    summary: 'Comportement face à l’acceptation puis au refus des permissions.',
    module: 'MISSIONS', profile: 'ANY', priority: 'P1', scenarioType: 'EXPLORATORY', estimatedMinutes: 8,
    preconditionsMd: '- Permissions réinitialisées pour l’app',
    steps: [
      s('Lancer une action qui demande la caméra (ajout de photo).', 'La demande de permission s’affiche avec un texte compréhensible.'),
      s('Refuser la permission.', 'L’app explique comment l’activer, sans plantage.'),
      s('Activer la permission depuis les réglages du téléphone puis revenir.', 'La caméra fonctionne.'),
      s('Répéter avec la localisation.', 'Même comportement : refus géré, activation possible.'),
    ],
  }),
  base('RATING-01', {
    title: 'Évaluation après une mission terminée',
    summary: 'Le client note l’artisan à la fin d’une mission.',
    module: 'MISSIONS', profile: 'CLIENT', priority: 'P2', estimatedMinutes: 4,
    preconditionsMd: '- Mission terminée',
    steps: [
      s('Ouvrir la mission terminée.', 'L’option d’évaluation est proposée.'),
      s('Donner une note et un commentaire.', 'La saisie est acceptée.'),
      s('Valider.', 'L’évaluation est enregistrée et visible (ou prise en compte) côté artisan.'),
    ],
  }),
  base('DISPUTE-01', {
    title: 'Signaler un problème sur une mission (litige / incident)',
    summary: 'Un utilisateur signale un incident sur une mission en cours.',
    module: 'MISSIONS', profile: 'ANY', priority: 'P1', estimatedMinutes: 6,
    preconditionsMd: '- Mission en cours entre deux comptes de test',
    steps: [
      s('Ouvrir la mission et chercher l’option de signalement.', 'L’option est accessible.'),
      s('Décrire le problème et envoyer.', 'Un accusé de réception s’affiche.'),
      s('Consulter le statut de la mission.', 'Le statut reflète le signalement.'),
      s('Côté autre partie : consulter la mission.', 'Elle est informée de la situation.'),
    ],
  }),

  // ─── ROBUSTESSE ───
  base('ROBUST-01', {
    title: 'Réseau instable ou coupé pendant l’utilisation',
    summary: 'L’app reste utilisable et informe l’utilisateur en cas de coupure.',
    module: 'MISSIONS', profile: 'ANY', priority: 'P0', scenarioType: 'EXPLORATORY', estimatedMinutes: 10,
    preconditionsMd: '- Utilisateur connecté\n- Possibilité d’activer le mode avion',
    steps: [
      s('Ouvrir la liste des missions puis activer le mode avion.', 'Les données déjà chargées restent consultables.'),
      s('Tenter une action nécessitant le réseau (publier, envoyer un message).', 'Un message clair indique l’absence de connexion ; pas de plantage.'),
      s('Réactiver le réseau.', 'L’app se resynchronise sans action manuelle complexe.'),
      s('Vérifier les données.', 'Aucun doublon ni perte de données.'),
    ],
  }),
  base('ROBUST-02', {
    title: 'Reprise de l’app après passage en arrière-plan',
    summary: 'Le contexte est conservé après un appel, un changement d’app ou une rotation.',
    module: 'ADMIN', profile: 'ANY', priority: 'P2', scenarioType: 'EXPLORATORY', estimatedMinutes: 6,
    preconditionsMd: '- Utilisateur connecté',
    steps: [
      s('Remplir à moitié un formulaire (ex. mission).', 'Les données saisies sont visibles.'),
      s('Passer à une autre application pendant 1 minute puis revenir.', 'L’écran et la saisie sont conservés.'),
      s('Pivoter le téléphone (si l’app le permet).', 'L’affichage reste utilisable.'),
    ],
  }),
  base('ROBUST-03', {
    title: 'Mise à jour de l’app avec conservation de la session',
    summary: 'Une nouvelle version s’installe par-dessus l’ancienne sans perte.',
    module: 'ADMIN', profile: 'ANY', priority: 'P1', scenarioType: 'REGRESSION', estimatedMinutes: 8,
    preconditionsMd: '- Version précédente installée et connectée\n- Nouvelle build disponible',
    steps: [
      s('Installer la nouvelle build par-dessus l’ancienne.', 'L’installation se termine sans désinstaller.'),
      s('Ouvrir l’app.', 'Elle démarre sans écran d’erreur.'),
      s('Vérifier la session et les données.', 'L’utilisateur est toujours connecté et retrouve ses données.'),
    ],
  }),
  base('PERF-01', {
    title: 'Temps de démarrage et fluidité sur appareil d’entrée de gamme',
    summary: 'Ressenti de performance sur un téléphone modeste.',
    module: 'ADMIN', profile: 'ANY', priority: 'P2', scenarioType: 'PERFORMANCE', estimatedMinutes: 10,
    preconditionsMd: '- Appareil Android d’entrée de gamme ou ancien',
    steps: [
      s('Fermer l’app puis la lancer et chronométrer jusqu’à l’écran d’accueil.', 'Le démarrage reste raisonnable (noter le temps).'),
      s('Faire défiler les listes de missions.', 'Le défilement est fluide, sans saccades marquées.'),
      s('Naviguer entre les onglets principaux 10 fois.', 'Aucun ralentissement progressif ni fermeture inattendue.'),
    ],
  }),
]

/** Modèle minimal proposé en téléchargement dans la fenêtre d'import. */
export const IMPORT_TEMPLATE = [
  {
    code: 'MON-SCENARIO-01',
    title: 'Titre du scénario',
    summary: 'Ce que ce scénario vérifie.',
    module: 'MISSIONS',
    profile: 'CLIENT',
    priority: 'P1',
    scenarioType: 'FUNCTIONAL',
    status: 'READY',
    estimatedMinutes: 5,
    tags: ['exemple'],
    preconditionsMd: '- Compte client connecté',
    testDataMd: '',
    steps: [
      { actionMd: 'Première action à effectuer.', expectedMd: 'Résultat attendu observable.' },
    ],
  },
]
