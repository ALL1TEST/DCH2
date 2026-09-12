// ============================================================
// i18n — FRAGMENT : module de page Tâches (tableau Kanban) — Français
// ============================================================

export const clientTasksFr: Record<string, string> = {
  // ---- En-tête de page ----
  'tasks.pageTitle': 'Tâches',
  'tasks.pageSubtitle': 'Planifiez, suivez et livrez votre travail',

  // ---- Barre d'outils ----
  'tasks.searchPlaceholder': 'Rechercher des tâches...',
  'tasks.filterPriority': 'Priorité',
  'tasks.filterStatus': 'Statut',
  'tasks.filterCreated': 'Créé le',
  'tasks.filterAll': 'Toutes',
  'tasks.sortManual': 'Manuel',
  'tasks.sortNewest': 'Plus récentes',
  'tasks.sortOldest': 'Plus anciennes',
  'tasks.sortLabel': 'Trier',
  'tasks.viewBoard': 'Vue tableau',
  'tasks.viewList': 'Vue liste',
  'tasks.newTask': 'Nouvelle tâche',

  // ---- Filtre de création ----
  'tasks.createdToday': "Aujourd'hui",
  'tasks.createdLast7': '7 derniers jours',
  'tasks.createdLast30': '30 derniers jours',

  // ---- Priorités ----
  'tasks.priorityLow': 'Basse',
  'tasks.priorityMedium': 'Moyenne',
  'tasks.priorityHigh': 'Haute',
  'tasks.priority': 'Priorité',

  // ---- Statuts ----
  'tasks.statusBacklog': 'Backlog',
  'tasks.statusTodo': 'À faire',
  'tasks.statusInProgress': 'En cours',
  'tasks.statusDone': 'Terminé',
  'tasks.status': 'Statut',

  // ---- Colonnes ----
  'tasks.columnBacklog': 'Backlog',
  'tasks.columnTodo': 'À faire',
  'tasks.columnInProgress': 'En cours',
  'tasks.columnDone': 'Terminé',
  'tasks.addTask': 'Ajouter une tâche',
  'tasks.noTasksInColumn': 'Aucune tâche pour le moment',
  'tasks.noTasksMatch': 'Aucune tâche ne correspond à vos filtres',

  // ---- Carte ----
  'tasks.dueDate': 'Échéance',
  'tasks.overdue': 'En retard',
  'tasks.assignee': 'Responsable',
  'tasks.noAssignee': 'Non assignée',
  'tasks.activity': 'Activité',
  'tasks.cardActions': 'Actions de la carte',

  // ---- Menu contextuel ----
  'tasks.moveTo': 'Déplacer vers',
  'tasks.setPriority': 'Définir la priorité',
  'tasks.deleteTask': 'Supprimer la tâche',

  // ---- Boîte de dialogue création / édition ----
  'tasks.createTitle': 'Créer une tâche',
  'tasks.editTitle': 'Modifier la tâche',
  'tasks.taskTitle': 'Titre',
  'tasks.taskTitlePlaceholder': 'Titre de la tâche',
  'tasks.taskDescription': 'Description',
  'tasks.taskDescriptionPlaceholder': 'Ajouter plus de détails...',
  'tasks.taskDueDate': "Date d'échéance",
  'tasks.taskAssignee': 'Responsable',
  'tasks.taskLabels': 'Étiquettes',
  'tasks.labelsHint': "Choisissez une étiquette prédéfinie ou saisissez la vôtre et appuyez sur Entrée",
  'tasks.addCustomLabel': 'Ajouter une étiquette',
  'tasks.customLabelPlaceholder': 'Étiquette personnalisée...',
  'tasks.removeLabel': "Retirer l'étiquette",
  'tasks.clearDueDate': "Effacer la date d'échéance",

  // ---- Confirmation de fin ----
  'tasks.doneConfirmTitle': 'Marquer comme terminé ?',
  'tasks.doneConfirmDescription': "Cette tâche nécessite une vérification manuelle. Confirmez que vous avez vérifié la modification sur votre site en ligne.",
  'tasks.doneConfirmNotYet': 'Pas encore',
  'tasks.doneConfirmChecked': "J'ai vérifié — marquer comme terminé",

  // ---- Confirmation de suppression ----
  'tasks.deleteConfirmTitle': 'Supprimer cette tâche ?',
  'tasks.deleteConfirmDescription': "Cette action est irréversible. La tâche sera définitivement supprimée de votre tableau.",

  // ---- État vide ----
  'tasks.emptyTitle': 'Aucune tâche pour le moment',
  'tasks.emptyDescription': 'Créez votre première tâche pour commencer à organiser votre travail.',
  'tasks.emptyCreate': 'Créer une tâche',

  // ---- Notifications ----
  'tasks.toastCreated': 'Tâche créée',
  'tasks.toastUpdated': 'Tâche mise à jour',
  'tasks.toastDeleted': 'Tâche supprimée',
  'tasks.toastMoved': 'Tâche déplacée vers {status}',
  'tasks.toastCreateError': 'Échec de la création de la tâche',
  'tasks.toastUpdateError': 'Échec de la mise à jour de la tâche',
  'tasks.toastDeleteError': 'Échec de la suppression de la tâche',
  'tasks.toastLoadError': 'Échec du chargement des tâches',

  // ---- Divers ----
  'tasks.priorityIndicator': 'Indicateur de priorité',
  'tasks.createdOn': 'Créée le',
  'tasks.updatedOn': 'Mise à jour le',
  'tasks.completedOn': 'Terminée le',
  'tasks.allStatuses': 'Tous les statuts',
  'tasks.allPriorities': 'Toutes les priorités',
  'tasks.acrossAllSites': 'Tous les sites',
  'tasks.siteSpecific': 'Ce site uniquement',
};
