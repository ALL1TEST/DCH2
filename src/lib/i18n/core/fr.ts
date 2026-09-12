// ============================================================
// i18n — DICTIONNAIRE FRANÇAIS (noyau)
// ============================================================
// Traduction française du noyau de clés (core) défini dans
// core/en.ts. Couvre tout le chrome partagé de l'application :
// actions courantes, navigation latérale (CMS client + Platform
// Admin), menu de profil, thème, langue, barre supérieure,
// authentification et titres de pages.
//
// Les chaînes profondes des pages vivent dans les fragments
// (src/lib/i18n/fragments/fr/*) fournis uniquement pour les
// locales complètement traduites (en + fr). Pour toute autre
// locale, la fonction t() retombe sur le dictionnaire anglais
// clé par clé — aucun clé manquante ne casse l'interface.
// ============================================================

export const coreFr: Record<string, string> = {
  // ---- Actions & libellés courants ----
  'common.save': 'Enregistrer',
  'common.saveChanges': 'Enregistrer les modifications',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.edit': 'Modifier',
  'common.create': 'Créer',
  'common.search': 'Rechercher...',
  'common.loading': 'Chargement...',
  'common.noData': 'Aucune donnée',
  'common.actions': 'Actions',
  'common.status': 'Statut',
  'common.name': 'Nom',
  'common.email': 'E-mail',
  'common.back': 'Retour',
  'common.close': 'Fermer',
  'common.confirm': 'Confirmer',
  'common.manage': 'Gérer',
  'common.active': 'Actif',
  'common.inactive': 'Inactif',
  'common.yes': 'Oui',
  'common.no': 'Non',
  'common.view': 'Voir',
  'common.refresh': 'Actualiser',
  'common.retry': 'Réessayer',
  'common.copy': 'Copier',
  'common.copied': 'Copié',
  'common.showing': 'Affichage',
  'common.of': 'sur',
  'common.results': 'résultats',

  // ---- Navigation latérale : groupes ----
  'nav.overview': 'Aperçu',
  'nav.content': 'Contenu',
  'nav.media': 'Médias',
  'nav.users': 'Utilisateurs',
  'nav.engagement': 'Engagement',
  'nav.platform': 'Plateforme',
  'nav.ai': 'IA',
  'nav.system': 'Système',

  // ---- Navigation latérale : éléments (CMS client) ----
  'nav.dashboard': 'Tableau de bord',
  'nav.allContent': 'Tout le contenu',
  'nav.articles': 'Articles',
  'nav.calendar': 'Calendrier',
  'nav.tasks': 'Tâches',
  'nav.categories': 'Catégories',
  'nav.tags': 'Tags',
  'nav.comments': 'Commentaires',
  'nav.newsletter': 'Newsletter',
  'nav.emailTemplates': 'Modèles d\'e-mail',
  'nav.seo': 'SEO',
  'nav.navigation': 'Navigation',
  'nav.analytics': 'Analytique',
  'nav.notifications': 'Notifications',
  'nav.webhooks': 'Webhooks',
  'nav.backups': 'Sauvegardes',
  'nav.monitoring': 'Surveillance',
  'nav.api': 'API',
  'nav.settings': 'Paramètres',
  'nav.profile': 'Profil',
  'nav.billing': 'Facturation',
  'nav.automation': 'Automatisation',
  'nav.smtpSettings': 'Paramètres SMTP',

  // ---- Navigation latérale : éléments (Platform Admin) ----
  'nav.executiveDashboard': 'Tableau de bord exécutif',
  'nav.customers': 'Clients',
  'nav.payments': 'Paiements',
  'nav.plans': 'Plans et tarifs',
  'nav.coupons': 'Coupons',
  'nav.stripeSettings': 'Paramètres Stripe',
  // Compte interne (menu latéral du compte interne dédié)
  'nav.internalDashboard': 'Tableau de bord',

  // ---- Menu déroulant du profil ----
  'menu.profile': 'Profil',
  'menu.language': 'Langue',
  'menu.theme': 'Thème',
  'menu.manageSubscription': 'Gérer l\'abonnement',
  'menu.logOut': 'Déconnexion',
  'menu.light': 'Clair',
  'menu.dark': 'Sombre',
  'menu.system': 'Système',
  'menu.default': 'Par défaut',

  // ---- Notifications de thème ----
  'theme.setLight': 'Thème réglé sur Clair',
  'theme.setDark': 'Thème réglé sur Sombre',
  'theme.setSystem': 'Thème réglé sur Système',

  // ---- Langue ----
  'language.title': 'Langue',
  'language.set': 'Langue définie sur',

  // ---- Barre supérieure / sélecteur de site ----
  'topbar.search': 'Rechercher...',
  'topbar.toggleTheme': 'Changer le thème',
  'topbar.notifications': 'Notifications',
  'topbar.switchSite': 'Changer de site',
  'topbar.allSites': 'Tous les sites',
  'topbar.createSite': 'Créer un nouveau site',
  'topbar.editSite': 'Modifier le site',
  'topbar.noSites': 'Aucun site',

  // ---- Authentification (écran de connexion) ----
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.email': 'E-mail',
  'auth.password': 'Mot de passe',
  'auth.signIn': 'Se connecter',
  'auth.signingIn': 'Connexion en cours...',

  // ---- Messages applicatifs ----
  'app.accessDenied': 'Accès refusé',
  'app.accessDeniedDescription':
    'Vous n\'avez pas la permission de consulter cette page. Contactez un administrateur si vous pensez qu\'il s\'agit d\'une erreur.',
  'app.search': 'Rechercher',
  'app.searchPlaceholder': 'Rechercher...',
  'app.searching': 'Recherche…',
  'app.noResults': 'Aucun résultat trouvé.',
  'app.noSearchMatch': 'Aucun client, paiement, forfait, coupon ou notification correspondant.',

  // ---- Titres des modules / pages ----
  'title.dashboard': 'Tableau de bord',
  'title.executiveDashboard': 'Tableau de bord exécutif',
  'title.articles': 'Articles',
  'title.calendar': 'Calendrier',
  'title.media': 'Médias',
  'title.users': 'Utilisateurs',
  'title.comments': 'Commentaires',
  'title.newsletters': 'Newsletters',
  'title.categories': 'Catégories',
  'title.tags': 'Tags',
  'title.analytics': 'Analytique',
  'title.jobs': 'Tâches',
  'title.seo': 'SEO',
  'title.ai': 'IA',
  'title.automation': 'Automatisation',
  'title.settings': 'Paramètres',
  'title.emailTemplates': 'Modèles d\'e-mail',
  'title.notifications': 'Notifications',
  'title.backups': 'Sauvegardes',
  'title.profile': 'Profil',
  'title.billing': 'Facturation et abonnement',
  'title.internalDashboard': 'Compte interne',
  'title.platformOverview': 'Aperçu',
  'title.platformCustomers': 'Clients',
  'title.platformPayments': 'Paiements',
  'title.platformPlans': 'Plans et tarifs',
  'title.platformCoupons': 'Coupons',
  'title.platformStripe': 'Paramètres Stripe',
  'title.platformNotifications': 'Notifications',
  'title.platformEmailTemplates': 'Modèles d\'e-mail',
  'title.platformSmtp': 'Paramètres SMTP',
  'title.platformAi': 'IA',
  'title.platformBackups': 'Sauvegardes',

  // ---- Page de profil (clés préexistantes, conservées) ----
  'profile.title': 'Profil',
  'profile.personalInfo': 'Informations personnelles',
  'profile.fullName': 'Nom complet',
  'profile.emailAddress': 'Adresse e-mail',
  'profile.saveChanges': 'Enregistrer les modifications',
  'profile.subscription': 'Abonnement',
  'profile.currentPlan': 'Plan actuel',
  'profile.price': 'Prix',
  'profile.trialStatus': 'Statut de l\'essai',
  'profile.manageSubscription': 'Gérer l\'abonnement',
  'profile.account': 'Compte',
  'profile.memberSince': 'Membre depuis',
  'profile.verified': 'Vérifié',
  'profile.notVerified': 'Non vérifié',
  'profile.nameSaved': 'Profil mis à jour avec succès',
  'profile.memberSinceUnknown': 'N/A',

  // ---- Page de facturation (clés préexistantes, conservées) ----
  'billing.title': 'Facturation et abonnement',
  'billing.description': 'Gérez votre abonnement et vos informations de facturation',
  'billing.subscription': 'Abonnement',
  'billing.currentPlan': 'Plan actuel',
  'billing.price': 'Prix',
  'billing.trial': 'Essai',
  'billing.trialActive': 'Essai actif',
  'billing.trialExpired': 'Essai expiré',
  'billing.managePayment': 'Gérer le moyen de paiement',
  'billing.cancelSubscription': 'Annuler l\'abonnement',
  'billing.paymentHistory': 'Historique des paiements',
  'billing.noPayments': 'Aucun historique de paiement. Lorsque vous effectuez un paiement, il apparaîtra ici.',
  'billing.date': 'Date',
  'billing.amount': 'Montant',
  'billing.status': 'Statut',
  'billing.invoice': 'Facture',
  'billing.manage': 'Gérer',
  'billing.otherPlans': 'Autres plans',
  'billing.upgrade': 'Passer à la version supérieure',
  'billing.downgrade': 'Rétrograder',
  'billing.changePlan': 'Changer de plan',
  'billing.free': 'Gratuit',
};
