import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  questionnaireResponses,
  questionResponses,
  questions,
  questionnaireAssignments,
} from '@/lib/dataverse/entityHooks';

/** Statut de la réponse (afb_statutglobal) → libellé + couleur. */
const RESP_STATUT: Record<number, { label: string; color: string }> = {
  0: { label: 'Validée', color: 'var(--success)' },
  1: { label: 'Brouillon', color: 'var(--text-muted)' },
  747010001: { label: 'Soumise', color: 'var(--warning)' },
  747010002: { label: 'Rejetée', color: 'var(--danger)' },
};

/** Statut de l'affectation quand aucune réponse n'existe encore. */
const ASSIGN_STATUT: Record<number, { label: string; color: string }> = {
  2: { label: 'Affecté', color: 'var(--text-muted)' },
  1: { label: 'En cours', color: 'var(--warning)' },
  747010001: { label: 'Soumis', color: 'var(--warning)' },
  0: { label: 'Validé', color: 'var(--success)' },
};

type Assignment = {
  afb_questionnaireassignmentid: string;
  _afb_tiers_value?: string;
  _afb_versionduquestionnaire_value?: string;
  afb_statut?: number;
};

/**
 * Revue des réponses d'un questionnaire, partenaire par partenaire.
 * Affiche le statut de chaque affectation ; pour les réponses soumises,
 * permet de dérouler les réponses et de Valider / Rejeter.
 */
export function QuestionnaireResponsesReview({
  questionnaireGuid,
  labelById,
  rawAssignments,
}: {
  questionnaireGuid: string | undefined;
  labelById: Map<string, string>;
  rawAssignments: Assignment[] | undefined;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const { data: allResponses } = questionnaireResponses.useList({ top: 500 });
  const { data: allQR } = questionResponses.useList({ top: 2000 });
  const { data: allQuestions } = questions.useList({ top: 2000 });
  const updateResponse = questionnaireResponses.useUpdate();
  const updateAssignment = questionnaireAssignments.useUpdate();

  const assigns = (rawAssignments ?? []).filter(
    (a) => a._afb_versionduquestionnaire_value === questionnaireGuid,
  );
  if (assigns.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Aucune affectation active. Cliquez sur « Affecter à des partenaires » pour démarrer.
      </div>
    );
  }

  // Dernière réponse par affectation.
  const respByAssign = new Map<string, { id: string; statut?: number }>();
  for (const r of (allResponses ?? []) as unknown as Array<Record<string, unknown>>) {
    const aid = r._afb_assignation_value as string | undefined;
    if (aid && !respByAssign.has(aid)) {
      respByAssign.set(aid, {
        id: r.afb_questionnaireresponseid as string,
        statut: r.afb_statutglobal as number | undefined,
      });
    }
  }
  const qLabel = new Map(
    (allQuestions ?? []).map((q) => [q.afb_questionid, q.afb_libelleenfrancais ?? '—']),
  );

  const decide = async (
    assignId: string,
    respId: string | undefined,
    valide: boolean,
    partner: string,
  ) => {
    if (!respId) {
      toast.error('Aucune réponse à valider pour ce partenaire.');
      return;
    }
    try {
      await updateResponse.mutateAsync({
        id: respId,
        changes: {
          afb_statutglobal: valide ? 0 : 747010002,
          ...(valide ? { afb_datedevalidation: new Date().toISOString() } : {}),
        } as unknown as Parameters<typeof updateResponse.mutateAsync>[0]['changes'],
      });
      await updateAssignment
        .mutateAsync({
          id: assignId,
          changes: { afb_statut: valide ? 0 : 747010001 } as unknown as Parameters<
            typeof updateAssignment.mutateAsync
          >[0]['changes'],
        })
        .catch(() => {});
      toast.success(valide ? `Réponses de ${partner} validées` : `Réponses de ${partner} rejetées`);
    } catch (e) {
      toast.error('Décision non enregistrée', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse.',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {assigns.map((a) => {
        const aid = a.afb_questionnaireassignmentid;
        const partner = labelById.get(a._afb_tiers_value ?? '') ?? '—';
        const resp = respByAssign.get(aid);
        const submitted = resp?.statut === 747010001 || resp?.statut === 0 || resp?.statut === 747010002;
        const badge = resp
          ? RESP_STATUT[resp.statut ?? 1]
          : ASSIGN_STATUT[a.afb_statut ?? 2] ?? { label: '—', color: 'var(--text-muted)' };
        const answers = resp
          ? ((allQR ?? []) as unknown as Array<Record<string, unknown>>).filter(
              (qr) => qr._afb_reponseauquestionnaire_value === resp.id,
            )
          : [];
        const isOpen = open === aid;
        return (
          <div
            key={aid}
            style={{
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                cursor: submitted ? 'pointer' : 'default',
              }}
              onClick={() => submitted && setOpen(isOpen ? null : aid)}
            >
              {submitted ? (
                isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              ) : (
                <span style={{ width: 16 }} />
              )}
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                {partner}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
              {resp?.statut === 747010001 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); decide(aid, resp.id, false, partner); }}
                    title="Rejeter"
                    style={btn('var(--accent)')}
                  >
                    <XCircle size={15} /> Rejeter
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); decide(aid, resp.id, true, partner); }}
                    title="Valider"
                    style={btn('#1d9d6f')}
                  >
                    <CheckCircle2 size={15} /> Valider
                  </button>
                </div>
              )}
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--glass-border)', padding: '10px 14px', background: 'var(--bg)' }}>
                {answers.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune réponse enregistrée.</div>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {answers.map((qr) => (
                      <li key={qr.afb_questionresponseid as string} style={{ fontSize: 13 }}>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {qLabel.get(qr._afb_question_value as string) ?? 'Question'}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {(qr.afb_valeurchoixunique as string) || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${color}`,
    color,
    background: '#fff',
    cursor: 'pointer',
  };
}
