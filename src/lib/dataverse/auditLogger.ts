/**
 * Journalisation automatique dans `afb_journalaudit`.
 *
 * Appelé par createEntityHooks après chaque mutation réussie : chaque création,
 * modification ou suppression sur n'importe quelle table laisse une trace.
 * La journalisation est « best-effort » : toute erreur est avalée pour ne JAMAIS
 * bloquer l'opération métier.
 */
import { Afb_journalauditsService } from '@/generated/services/Afb_journalauditsService';

const ACTION_CODE = { create: 0, update: 1, delete: 747010003 } as const;
const ACTION_LABEL = { create: 'Création', update: 'Modification', delete: 'Suppression' } as const;

export async function logAudit(params: {
  /** Nom logique de la table, ex. 'afb_tiers'. */
  entity: string;
  /** GUID de l'enregistrement concerné. */
  recordId?: string;
  action: keyof typeof ACTION_CODE;
}): Promise<void> {
  // Ne pas journaliser le journal lui-même (évite toute récursion).
  if (params.entity === 'afb_journalaudit') return;
  try {
    await Afb_journalauditsService.create({
      afb_identifiantdujournal: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      afb_horodatage: new Date().toISOString(),
      afb_entitemodifiee: `${ACTION_LABEL[params.action]} · ${params.entity}`,
      afb_guiddelenregistrement: params.recordId ?? '',
      afb_typedaction: ACTION_CODE[params.action],
    } as unknown as Parameters<typeof Afb_journalauditsService.create>[0]);
  } catch {
    // Silencieux : la traçabilité ne doit jamais casser l'action utilisateur.
  }
}
