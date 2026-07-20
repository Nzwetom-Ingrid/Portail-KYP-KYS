/**
 * Conversion de la table Dataverse `afb_journalaudit` vers le type d'affichage
 * `AuditLog`. La table n'a pas de champ « résultat » : on le déduit du type
 * d'action (Rejet → Avertissement, sinon Succès).
 */
import type { Afb_journalaudits } from '@/generated/models/Afb_journalauditsModel';
import type { AuditLog } from '@/lib/mockData';

/** Libellés Dataverse (parfois tronqués) → libellé FR propre pour l'action. */
const ACTION_LABEL: Record<string, string> = {
  Cr_ation: 'Création',
  Modification: 'Modification',
  Export: 'Export',
  Connexion: 'Connexion',
  Lecture: 'Lecture',
  Rejet: 'Rejet',
  Suppression: 'Suppression',
  Validation: 'Validation',
};

/** Type d'action Dataverse → catégorie d'affichage. */
const ACTION_TO_CATEGORIE: Record<string, AuditLog['categorie']> = {
  Validation: 'Validation',
  Rejet: 'Validation',
  Connexion: 'Connexion',
  Modification: 'Modification',
  Cr_ation: 'Modification',
  Lecture: 'Modification',
  Export: 'Export',
  Suppression: 'Administration',
};

// retrieveMultiple ne renvoie pas le libellé de choix (`afb_typedactionname`) →
// on mappe depuis la valeur numérique (cf. ACTION_CODE de auditLogger).
const ACTION_NUM_LABEL: Record<number, string> = {
  0: 'Création',
  1: 'Modification',
  747010003: 'Suppression',
};
const ACTION_NUM_CATEGORIE: Record<number, AuditLog['categorie']> = {
  0: 'Modification',
  1: 'Modification',
  747010003: 'Administration',
};

function frDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toAuditLog(l: Afb_journalaudits, usersByGuid?: Map<string, string>): AuditLog {
  const actionKey = l.afb_typedactionname ?? '';
  const actionNum = l.afb_typedaction as number | undefined;
  // Auteur : résolu via le GUID du lookup (le `*name` n'est pas renvoyé par le SDK).
  const auteurGuid = l._afb_auteurdelamodification_value;
  return {
    id: l.afb_identifiantdujournal || l.afb_journalauditid,
    horodatage: frDateTime(l.afb_horodatage),
    utilisateur:
      (auteurGuid ? usersByGuid?.get(auteurGuid) : undefined) ??
      l.afb_auteurdelamodificationname ??
      l.owneridname ??
      '—',
    action:
      (actionNum != null ? ACTION_NUM_LABEL[actionNum] : undefined) ?? ACTION_LABEL[actionKey] ?? '—',
    categorie:
      (actionNum != null ? ACTION_NUM_CATEGORIE[actionNum] : undefined) ??
      ACTION_TO_CATEGORIE[actionKey] ??
      'Modification',
    cible: l.afb_entitemodifiee ?? '—',
    resultat: actionKey === 'Rejet' ? 'Avertissement' : 'Succès',
    ip: l.afb_adresseipsource ?? '—',
  };
}
