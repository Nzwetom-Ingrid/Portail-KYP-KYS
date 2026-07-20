/**
 * Centre de notifications dérivé (sans table dédiée) à partir des décisions
 * (`afb_decision`) et des dossiers (`afb_dossierkypkys`).
 *
 * - Niveau 1/2 (peut confirmer) : voit les PROPOSITIONS en attente (décision de
 *   niveau 747010000 sur un dossier encore « En revue »).
 * - Niveau 3 : voit ses propres propositions qui ont été TRAITÉES par un
 *   responsable (le dossier n'est plus « En revue »).
 */
import { useMemo } from 'react';
import { decisions, dossiersKypKys } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';

export interface DossierNotif {
  id: string;
  title: string;
  desc: string;
  time: string;
  /** Route vers laquelle naviguer au clic. */
  target: string;
}

const NIVEAU_PROPOSITION = 747010000;
const STATUT_EN_REVUE = 1;
const STATUT_LABEL: Record<number, string> = {
  0: 'validée',
  2: 'renvoyée pour complément',
  747010001: 'suspendue',
  747010002: 'rejetée',
};

function frDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
}

export function useDossierNotifications(): DossierNotif[] {
  const can = useRoleStore((s) => s.can);
  const myGuid = useRoleStore((s) => s.identity.utilisateurInterneId);
  const { data: rawDecisions } = decisions.useList({ top: 300 });
  const { data: rawDossiers } = dossiersKypKys.useList({ top: 500 });

  return useMemo<DossierNotif[]>(() => {
    const decs = rawDecisions ?? [];
    const byGuid = new Map((rawDossiers ?? []).map((d) => [d.afb_dossierkypkysid, d]));
    const isConfirmer = can('dossiers.confirm');
    const seen = new Set<string>();
    const out: DossierNotif[] = [];

    for (const dec of decs) {
      if ((dec.afb_niveaudevalidation as number) !== NIVEAU_PROPOSITION) continue;
      const dg = dec._afb_dossier_value;
      if (!dg || seen.has(dg)) continue;
      const dos = byGuid.get(dg);
      if (!dos) continue;
      const statut = dos.afb_statutdudossier as number;
      const ref = dos.afb_referencedudossier ?? '—';

      if (isConfirmer) {
        // Proposition en attente (dossier encore en revue).
        if (statut !== STATUT_EN_REVUE) continue;
        seen.add(dg);
        out.push({
          id: dec.afb_decisionid,
          title: `Validation demandée — ${ref}`,
          desc: (dec.afb_notesoumotif || 'Proposition en attente de votre confirmation.').slice(0, 100),
          time: frDate(dec.afb_horodatagedeladecision),
          target: '/validations-dconf',
        });
      } else if (myGuid && dec._afb_auteurdeladecision_value === myGuid) {
        // Ma proposition a été traitée (dossier sorti de « En revue »).
        if (statut === STATUT_EN_REVUE) continue;
        seen.add(dg);
        out.push({
          id: dec.afb_decisionid,
          title: `Proposition traitée — ${ref}`,
          desc: `Votre proposition a été ${STATUT_LABEL[statut] ?? 'traitée'} par un responsable.`,
          time: frDate(dec.afb_horodatagedeladecision),
          target: '/dossiers',
        });
      }
    }
    return out;
  }, [rawDecisions, rawDossiers, can, myGuid]);
}
