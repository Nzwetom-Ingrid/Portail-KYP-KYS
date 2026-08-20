import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  Tooltip,
  Dropdown,
  Option,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  Calendar20Regular,
  CheckmarkCircle20Filled,
  CheckmarkCircle20Regular,
  ClipboardTaskListLtr20Regular,
  DismissCircle20Regular,
  DocumentText20Regular,
  Eye20Regular,
  Mail20Regular,
  ShieldCheckmark20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { RisqueBadge, StatutBadge } from '@/components/common/StatusBadge';
import {
  DetailDrawer,
  DrawerSection,
  DrawerTimeline,
  FieldGrid,
  type StatusBadge as DrawerStatusBadge,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { type Dossier } from '@/lib/mockData';
import { decisions, dossiersKypKys, tiers as tiersHooks, partnerTypes, utilisateursInternes, journalAudit, documents } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { assignQuestionnairesForTiers } from '@/lib/dataverse/assignQuestionnaires';
import { useT } from '@/i18n/i18n';

/** Événement d'audit résolu (auteur lisible) pour la timeline de traçabilité. */
interface AuditEvent {
  when: string;
  /** Code afb_typedaction : 0 création, 1 modification, 747010003 suppression. */
  action: number;
  author: string;
}

/** Événement de traçabilité enrichi (titre métier + motif) pour le drawer. */
interface TraceEvent {
  when: string;
  title: string;
  author: string;
  detail?: string;
}

import { toDossier } from '@/lib/dataverse/dossierMappers';
import { getDocumentBinary, base64ToBlob } from '@/lib/dataverse/documentFile';
import { COUNTRIES } from '@/lib/countries';
import { downloadTiersReport } from '@/lib/tiersReport';
import { exportToCsv } from '@/lib/exportCsv';

/** Statut du dossier (affichage) → choix Dataverse afb_statutdudossier. */
// Le risque se trie par GRAVITE, pas par ordre alphabetique : un tri A-Z
// placerait « High » avant « Low », ce qui n'a aucun sens pour une file de
// validation ou l'on cherche d'abord les dossiers les plus exposes.
const RISQUE_ORDRE: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

const STATUT_DOSSIER_TO_DV = { valider: 0, enRevue: 1, completer: 2, suspendre: 747010001, rejeter: 747010002 } as const;
import {
  entityTypeLabels,
  entityTypeValidityMonths,
  entityTypeFromFamille,
  requiredDocsByType,
  parseRequiredDocs,
  type RequiredDoc,
  type EntityType,
} from '@/lib/entity-types';

/* =====================================================================
   Styles
   ===================================================================== */

const useStyles = makeStyles({
  /* Queue */
  queueRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  queueCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '20px 22px 18px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    overflow: 'hidden',
    minHeight: '128px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms, border-color 280ms',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 24px -6px rgba(15, 15, 15, 0.08), 0 4px 8px -2px rgba(15, 15, 15, 0.04)',
      borderTopColor: '#E0DDD3', borderRightColor: '#E0DDD3', borderBottomColor: '#E0DDD3', borderLeftColor: '#E0DDD3',
    },
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      backgroundColor: 'currentColor',
      opacity: 0.85,
    },
  },
  queueCardActive: {
    borderTopColor: 'currentColor', borderRightColor: 'currentColor', borderBottomColor: 'currentColor', borderLeftColor: 'currentColor',
    boxShadow: '0 0 0 1px currentColor, 0 12px 24px -6px rgba(15, 15, 15, 0.10)',
  },
  queueLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  queueValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0A0A0A',
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  queueMeta: {
    fontSize: '12px',
    color: '#737373',
    marginTop: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  queueBubble: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
  },

  /* Entity cell */
  entityCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    backgroundColor: '#FDF0F1',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '12.5px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  entityMeta: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  entityName: { fontSize: '13.5px', fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.005em' },
  entityCode: {
    fontSize: '11px',
    color: '#A3A3A3',
    fontFamily: '"JetBrains Mono", monospace',
  },
  rowActions: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  /* Type cards in modal */
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  typeCard: {
    position: 'relative',
    textAlign: 'left',
    padding: '16px 16px 14px',
    borderRadius: '12px',
    border: '1.5px solid #ECEAE4',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    ':hover': {
      borderTopColor: '#FDA3AA', borderRightColor: '#FDA3AA', borderBottomColor: '#FDA3AA', borderLeftColor: '#FDA3AA',
      boxShadow: '0 6px 16px -4px rgba(200, 16, 46, 0.08)',
      transform: 'translateY(-1px)',
    },
  },
  typeCardActive: {
    borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)',
    backgroundColor: '#FDFAFA',
    boxShadow: '0 6px 16px -4px rgba(200, 16, 46, 0.18), inset 0 0 0 1px var(--accent)',
    ':hover': {
      borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)',
      boxShadow: '0 8px 20px -4px rgba(200, 16, 46, 0.22), inset 0 0 0 1px var(--accent)',
    },
  },
  typeIconBubble: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6',
    color: '#404040',
    border: '1px solid #ECEAE4',
    marginBottom: '4px',
  },
  typeIconActive: {
    backgroundColor: '#FDF0F1',
    color: 'var(--accent)',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  typeTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
  },
  typeDescription: {
    fontSize: '11.5px',
    color: '#525252',
    lineHeight: 1.5,
  },
  typeValidity: {
    marginTop: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#854020',
    backgroundColor: '#FDF6E3',
    border: '1px solid #FAEDC5',
    borderRadius: '999px',
    width: 'fit-content',
  },
  selectedRing: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    boxShadow: '0 0 0 2px #FFFFFF, 0 1px 3px rgba(200, 16, 46, 0.3)',
  },

  /* Document checklist */
  docList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #F4F2EC',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#1A1A1A',
    borderBottom: '1px solid #F4F2EC',
    transition: 'background-color 160ms',
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#FAF9F6' },
  },
  docName: { flex: 1, minWidth: 0, fontWeight: 500 },
  docHint: { fontSize: '11.5px', color: '#737373', fontWeight: 400 },
  docTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderRadius: '999px',
    border: '1px solid transparent',
  },
  docTagMandatory: {
    backgroundColor: '#FDF0F1',
    color: '#8C040D',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  docTagOptional: {
    backgroundColor: '#F4F2EC',
    color: '#525252',
    borderTopColor: '#ECEAE4', borderRightColor: '#ECEAE4', borderBottomColor: '#ECEAE4', borderLeftColor: '#ECEAE4',
  },
  docViewLink: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--accent)',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background-color 160ms',
    ':hover': { backgroundColor: '#FDF0F1' },
  },

  /* Stats grid in drawer */
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  riskCell: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #F4F2EC',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  riskLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },

  /* Complement modal */
  complementDocList: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #ECEAE4',
    borderRadius: '10px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  complementDocRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#1A1A1A',
    borderBottom: '1px solid #F4F2EC',
    cursor: 'pointer',
    transition: 'background-color 160ms',
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#FAF9F6' },
  },

  helperBanner: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
    borderRadius: '10px',
    fontSize: '12.5px',
    color: '#525252',
    lineHeight: 1.55,
  },
});

/* =====================================================================
   Constantes
   ===================================================================== */

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function inferEntityType(d: Dossier): EntityType {
  if (d.type === 'Fournisseur') return 'fournisseur';
  if (d.type === 'Partenaire') return 'partenaire';
  return 'partenaire';
}

/** Date du jour au format fr-FR (pour horodater les réponses au tiers). */
function frToday(): string {
  return new Date().toLocaleDateString('fr-FR');
}

/** Extrait un message lisible d'une erreur (Error, string, objet Dataverse, …). */
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'Erreur Dataverse inconnue.';
  }
}

/* =====================================================================
   Page
   ===================================================================== */

export default function DossiersValidation() {
  const styles = useStyles();
  const { t } = useT();
  const can = useRoleStore(s => s.can);
  const { notifySuccess, notifyInfo, notifyError } = useNotifications();

  // Données réelles depuis Dataverse (table afb_dossierkypkys).
  const { data: rawDossiers, isLoading, error } = dossiersKypKys.useList({ top: 200 });
  // Tiers chargés pour enrichir les dossiers (pays, risque, chargé, type) via le lookup.
  const { data: rawTiersForMap } = tiersHooks.useList({ top: 500 });
  const tiersByGuid = useMemo(
    () => new Map((rawTiersForMap ?? []).map((t) => [t.afb_tiersid, t])),
    [rawTiersForMap],
  );
  // Utilisateurs internes pour résoudre le nom du chargé de relation (lookup).
  const { data: usersForMap } = utilisateursInternes.useList({ top: 500 });
  const usersByGuid = useMemo(
    () => new Map((usersForMap ?? []).map((u) => [u.afb_utilisateurinterneid, u])),
    [usersForMap],
  );
  const dossiers = useMemo(
    () => (rawDossiers ?? []).map((d) => toDossier(d, tiersByGuid, usersByGuid)),
    [rawDossiers, tiersByGuid, usersByGuid],
  );

  const updateDossier = dossiersKypKys.useUpdate();
  // Résout le GUID Dataverse à partir de l'id affiché (référence du dossier).
  const guidByRef = useMemo(
    () =>
      new Map(
        (rawDossiers ?? []).map((d) => [d.afb_referencedudossier ?? d.afb_dossierkypkysid, d.afb_dossierkypkysid]),
      ),
    [rawDossiers],
  );

  // Journal d'audit réel : trace « qui a fait quoi quand » par enregistrement.
  const { data: rawAudit } = journalAudit.useList({ top: 1000 });
  // Décisions (afb_decision) : actions métier détaillées (validation, complément, rejet…).
  const { data: rawDecisions } = decisions.useList({ top: 500 });
  const auditByRecord = useMemo(() => {
    const m = new Map<string, AuditEvent[]>();
    for (const l of rawAudit ?? []) {
      const rec = l.afb_guiddelenregistrement;
      if (!rec) continue;
      const authorGuid = l._afb_auteurdelamodification_value;
      const author =
        (authorGuid ? usersByGuid.get(authorGuid)?.afb_nomcomplet : undefined) ??
        l.afb_auteurdelamodificationname ??
        '—';
      const ev: AuditEvent = {
        when: l.afb_horodatage ?? '',
        action: l.afb_typedaction as number,
        author,
      };
      const arr = m.get(rec);
      if (arr) arr.push(ev);
      else m.set(rec, [ev]);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.when.localeCompare(b.when));
    return m;
  }, [rawAudit, usersByGuid]);

  // « Créé par » par référence de dossier (auteur de l'entrée de création).
  const creeParByRef = useMemo(() => {
    const m = new Map<string, string>();
    for (const [ref, guid] of guidByRef) {
      const createEv = (auditByRecord.get(guid) ?? []).find((e) => e.action === 0);
      if (createEv && createEv.author !== '—') m.set(ref, createEv.author);
    }
    return m;
  }, [guidByRef, auditByRecord]);

  // Traçabilité complète par dossier : création (journal) + toutes les actions
  // métier (décisions : validation/proposition, complément, rejet, suspension).
  const timelineByGuid = useMemo(() => {
    const m = new Map<string, TraceEvent[]>();
    const add = (rec: string, ev: TraceEvent) => {
      const arr = m.get(rec);
      if (arr) arr.push(ev);
      else m.set(rec, [ev]);
    };
    for (const l of rawAudit ?? []) {
      if ((l.afb_typedaction as number) !== 0) continue; // on ne garde que la création
      const rec = l.afb_guiddelenregistrement;
      if (!rec) continue;
      const ag = l._afb_auteurdelamodification_value;
      const author =
        (ag ? usersByGuid.get(ag)?.afb_nomcomplet : undefined) ?? l.afb_auteurdelamodificationname ?? '—';
      add(rec, { when: l.afb_horodatage ?? '', title: t('Dossier créé'), author });
    }
    for (const dec of rawDecisions ?? []) {
      const rec = dec._afb_dossier_value;
      if (!rec) continue;
      const ag = dec._afb_auteurdeladecision_value;
      const author =
        (ag ? usersByGuid.get(ag)?.afb_nomcomplet : undefined) ?? dec.afb_auteurdeladecisionname ?? '—';
      const type = dec.afb_typededecision as number;
      const proposed = (dec.afb_niveaudevalidation as number) === 747010000;
      const title =
        type === 0 ? (proposed ? t('Validation proposée') : t('Validation effective'))
        : type === 1 ? t('Demande de complément')
        : type === 747010001 ? (proposed ? t('Rejet proposé') : t('Rejet effectif'))
        : type === 747010002 ? t('Suspension')
        : t('Décision');
      const motif = dec.afb_notesoumotif && dec.afb_notesoumotif !== '—' ? dec.afb_notesoumotif : undefined;
      add(rec, { when: dec.afb_horodatagedeladecision ?? '', title, author, detail: motif });
    }
    for (const arr of m.values()) arr.sort((a, b) => a.when.localeCompare(b.when));
    return m;
  }, [rawAudit, rawDecisions, usersByGuid]);

  // Registre des décisions (afb_decision) — auteur = utilisateur interne courant.
  const createDecision = decisions.useCreate();
  // Auteur = utilisateur RÉELLEMENT connecté, résolu par useResolveCurrentRole.
  // Auparavant cette valeur venait d'un contexte de démonstration dont l'e-mail
  // était écrit en dur : les décisions étaient donc journalisées au nom d'une
  // personne fictive, ou à défaut du premier utilisateur de la liste. Dans un
  // registre de décisions LCB-FT, l'auteur doit être exact ou absent — jamais
  // approximatif. Sans identité résolue, recordDecision s'abstient (cf. plus bas).
  const authorGuid = useRoleStore((s) => s.identity.utilisateurInterneId);

  /**
   * Enregistre une décision formelle liée au dossier (best-effort : un échec ici
   * ne bloque jamais l'action principale, déjà persistée sur le dossier).
   */
  const recordDecision = async (
    kind: 'validate' | 'reject' | 'complement',
    dossier: Dossier,
    motif: string,
    elements?: string,
    // 747010000 = proposition (niveau 3) ; 747010001 = validation effective (niveau 1/2).
    niveau: number = 747010000,
  ) => {
    if (!authorGuid) return; // aucun auteur résoluble → on saute le registre
    const dossierGuid = guidByRef.get(dossier.id);
    const typeDecision = kind === 'validate' ? 0 : kind === 'reject' ? 747010001 : 1;
    try {
      await createDecision.mutateAsync({
        'afb_auteurdeladecision@odata.bind': `/afb_utilisateurinternes(${authorGuid})`,
        ...(dossierGuid ? { 'afb_dossier@odata.bind': `/afb_dossierkypkyses(${dossierGuid})` } : {}),
        afb_typededecision: typeDecision,
        afb_niveaudevalidation: niveau,
        afb_horodatagedeladecision: new Date().toISOString(),
        afb_identifiantdeladecision: `DEC-${dossier.id}-${Date.now()}`,
        afb_notesoumotif: motif || '—',
        ...(elements ? { afb_elementsacorriger: elements } : {}),
      } as unknown as Parameters<typeof createDecision.mutateAsync>[0]);
    } catch (e) {
      // Diagnostic : on remonte le message Dataverse réel pour identifier le champ rejeté.
      console.error('recordDecision failed', e);
      notifyInfo(t('Décision non journalisée'), { description: errorMessage(e) });
    }
  };

  // Recherche globale (Header) : pre-remplit la recherche depuis ?q= a l'arrivee.
  const [searchParams] = useSearchParams();
  const qUrl = searchParams.get('q');

  /* Drawer & dialogs */
  const [openDossier, setOpenDossier] = useState<Dossier | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [complementOpen, setComplementOpen] = useState(false);
  const [validateAction, setValidateAction] = useState<{ dossier: Dossier; intent: 'validate' | 'reject' } | null>(
    null,
  );

  const columns: Column<Dossier>[] = [
    {
      key: 'entite',
      header: 'Entité',
      sortValue: (d) => d.entite,
      // L'entite porte aussi la reference du dossier : on doit pouvoir chercher les deux.
      searchValue: (d) => `${d.entite} ${d.id}`,
      render: (d) => (
        <div className={styles.entityCell}>
          <div className={styles.avatar}>{getInitials(d.entite)}</div>
          <div className={styles.entityMeta}>
            <span className={styles.entityName}>{d.entite}</span>
            <span className={styles.entityCode}>{d.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: (d) => d.type,
      searchValue: (d) => d.type,
      filterable: true,
      render: (d) => (
        <Badge appearance="tint" color="subtle" size="small">
          {d.type}
        </Badge>
      ),
    },
    { key: 'pays', header: 'Pays', sortValue: (d) => d.pays, searchValue: (d) => d.pays, filterable: true, render: (d) => d.pays ?? '—' },
    { key: 'risque', header: 'Risque', sortValue: (d) => RISQUE_ORDRE[d.risque] ?? 99, searchValue: (d) => d.risque, filterable: true, render: (d) => <RisqueBadge risque={d.risque} /> },
    { key: 'statut', header: 'Statut', sortValue: (d) => d.statut, searchValue: (d) => d.statut, filterable: true, render: (d) => <StatutBadge statut={d.statut} /> },
    { key: 'charge', header: 'Chargé', sortValue: (d) => d.charge, searchValue: (d) => d.charge, filterable: true, render: (d) => d.charge ?? '—' },
    { key: 'direction', header: 'Direction', sortValue: (d) => d.direction, searchValue: (d) => d.direction, filterable: true, render: (d) => d.direction ?? '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div
          className={styles.rowActions}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content={t('Ouvrir le dossier')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<Eye20Regular />}
              onClick={() => setOpenDossier(d)}
              aria-label={t('Voir')}
            />
          </Tooltip>
          <Tooltip content={t('Valider')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              onClick={() => setValidateAction({ dossier: d, intent: 'validate' })}
              aria-label={t('Valider')}
            />
          </Tooltip>
          <Tooltip content={t('Rejeter')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: 'var(--accent)' }} />}
              onClick={() => setValidateAction({ dossier: d, intent: 'reject' })}
              aria-label={t('Rejeter')}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  // Recherche et filtres derives des colonnes : marquer une colonne
  // filtrable suffit a lui donner sa liste deroulante, alimentee par les valeurs
  // reellement presentes dans les donnees.
  const table = useTableFilters(dossiers, columns);
  const { search, setSearch } = table;
  const filtered = table.rows;

  // La recherche globale de l'en-tete pre-remplit celle de la page.
  useEffect(() => {
    if (qUrl) setSearch(qUrl);
  }, [qUrl, setSearch]);

  const anyFilterActive = table.actif;
  const resetFilters = table.reset;
  const toggleStatut = (v: string) => table.toggleFilter('statut', v);
  const toggleRisque = (v: string) => table.toggleFilter('risque', v);


  // Cartes KPI dynamiques + cliquables : chaque carte applique/retire son filtre.
  const queue = [
    {
      label: t('En attente de revue'),
      count: dossiers.filter((d) => d.statut === 'En revue').length,
      color: 'var(--warning)',
      meta: t('priorité hiérarchique'),
      icon: <ClipboardTaskListLtr20Regular />,
      active: table.hasFilter('statut', 'En revue'),
      onClick: () => toggleStatut('En revue'),
    },
    {
      label: t('Risque élevé'),
      count: dossiers.filter((d) => d.risque === 'High').length,
      color: '#8C040D',
      meta: t('double validation'),
      icon: <ShieldCheckmark20Regular />,
      active: table.hasFilter('risque', 'High'),
      onClick: () => toggleRisque('High'),
    },
    {
      label: t('Validés ce mois'),
      count: dossiers.filter((d) => d.statut === 'Validé').length,
      color: '#15803D',
      meta: t('archivés'),
      icon: <CheckmarkCircle20Filled />,
      active: table.hasFilter('statut', 'Validé'),
      onClick: () => toggleStatut('Validé'),
    },
    {
      label: t('Rejetés'),
      count: dossiers.filter((d) => d.statut === 'Rejeté').length,
      color: '#B91C1C',
      meta: t("renvoyés à l'émetteur"),
      icon: <DismissCircle20Regular />,
      active: table.hasFilter('statut', 'Rejeté'),
      onClick: () => toggleStatut('Rejeté'),
    },
  ];

  const exportDossiers = async () => {
    const ok = exportToCsv(
      `dossiers-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((d) => ({
        Référence: d.id,
        Entité: d.entite,
        Type: d.type,
        Risque: d.risque,
        Statut: d.statut,
        Direction: d.direction,
        Date: d.dateCreation,
        Chargé: d.charge ?? '',
        'Créé par': creeParByRef.get(d.id) ?? d.charge ?? '',
      })),
    );
    notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
      description: ok ? `${filtered.length} ${t('dossiers exportés (CSV).')}` : t('Aucun dossier à exporter.'),
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pilotage · Conformité"
        title="Dossiers"
        subtitle="File de travail priorisée — dossiers en attente de validation hiérarchique. Standard, Élevé et Critique."
        actions={
          <>
            {can('reports.export') && (
              <Button icon={<ArrowDownload20Regular />} appearance="outline" onClick={exportDossiers}>
                {t('Export')}
              </Button>
            )}
            {can('partners.create') && (
              <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
                {t('Nouveau dossier')}
              </Button>
            )}
          </>
        }
      />

      <div className={styles.queueRow}>
        {queue.map((q) => (
          <button
            type="button"
            key={q.label}
            className={mergeClasses(styles.queueCard, q.active && styles.queueCardActive)}
            style={{ color: q.color }}
            onClick={q.onClick}
            aria-pressed={q.active}
          >
            <div className={styles.queueBubble} style={{ color: q.color }}>
              {q.icon}
            </div>
            <div className={styles.queueLabel}>{q.label}</div>
            <div className={styles.queueValue} style={{ color: q.color }}>
              {q.count}
            </div>
            <div className={styles.queueMeta}>{q.meta}</div>
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher dans toutes les colonnes…"
        filters={table.filterConfigs}
        trailing={
          anyFilterActive ? (
            <Button appearance="subtle" icon={<DismissCircle20Regular />} onClick={resetFilters}>
              {t('Réinitialiser')}
            </Button>
          ) : undefined
        }
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardTaskListLtr20Regular style={{ color: '#737373' }} /> {t('Dossiers à traiter')}
          </span>
        }
        subtitle={`${filtered.length} dossiers — file de validation`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement des dossiers…')}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(d) => d.id}
            emptyMessage="Aucun dossier ne correspond aux filtres."
            onRowClick={(d) => setOpenDossier(d)}
          />
        )}
      </Card>

      {/* ===== Drawer dossier ===== */}
      <DossierDrawer
        dossier={openDossier}
        timeline={openDossier ? timelineByGuid.get(guidByRef.get(openDossier.id) ?? '') ?? [] : []}
        onClose={() => setOpenDossier(null)}
        onAskComplement={() => setComplementOpen(true)}
        onValidate={() =>
          openDossier && setValidateAction({ dossier: openDossier, intent: 'validate' })
        }
        onReject={() =>
          openDossier && setValidateAction({ dossier: openDossier, intent: 'reject' })
        }
      />

      {/* ===== Nouveau dossier ===== */}
      <NewDossierDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(label, ref, email) => {
          notifySuccess(t('Dossier créé'), {
            description: `${ref} · ${label} ${t('— invitation envoyée à')} ${email}.`,
          });
        }}
      />

      {/* ===== Complément ===== */}
      {openDossier && (
        <ComplementDialog
          open={complementOpen}
          onOpenChange={setComplementOpen}
          dossier={openDossier}
          onSent={async ({ deadline, message }) => {
            const guid = openDossier ? guidByRef.get(openDossier.id) : undefined;
            if (!guid) {
              notifyError(t('Action impossible'), { description: t('Dossier introuvable dans Dataverse.') });
              throw new Error('GUID introuvable');
            }
            // Réponse consignée sur le dossier (lue par le tiers + reprise dans l'e-mail Power Automate).
            const reponse = [
              `Décision DCONF : Complément demandé (${frToday()})`,
              message.trim(),
              deadline ? `Échéance : ${deadline}` : '',
            ]
              .filter(Boolean)
              .join('\n\n');
            try {
              await updateDossier.mutateAsync({
                id: guid,
                changes: {
                  afb_statutdudossier: STATUT_DOSSIER_TO_DV.completer,
                  afb_commentairedconf: reponse,
                  ...(deadline ? { afb_prochainecheancier: new Date(deadline).toISOString() } : {}),
                },
              });
              await recordDecision('complement', openDossier, reponse);
            } catch (e) {
              notifyError(t('Échec de la mise à jour'), {
                description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
              });
              throw e;
            }
            notifySuccess(t('Demande envoyée'), {
              description: `${t('Le tiers sera notifié par e-mail')}${deadline ? ` · ${t('échéance')} ${deadline}` : ''}.`,
            });
          }}
        />
      )}

      {/* ===== Valider / Rejeter ===== */}
      <ConfirmActionDialog
        open={!!validateAction}
        onOpenChange={(o) => !o && setValidateAction(null)}
        intent={validateAction?.intent === 'reject' ? 'reject' : 'validate'}
        entityRef={validateAction?.dossier.id}
        title={
          !can('dossiers.confirm')
            ? validateAction?.intent === 'reject'
              ? t('Proposer le rejet ?')
              : t('Proposer la validation ?')
            : validateAction?.intent === 'reject'
              ? t('Rejeter ce dossier ?')
              : t('Valider ce dossier ?')
        }
        description={
          validateAction
            ? !can('dossiers.confirm')
              ? `${t('Votre')} ${validateAction.intent === 'reject' ? t('rejet') : t('validation')} ${t('de')} ${validateAction.dossier.entite} ${t('sera enregistré comme proposition et devra être confirmé par un responsable sur la page « Validation ». Le dossier reste « En revue » d\'ici là.')}`
              : validateAction.intent === 'reject'
                ? `${t('Le dossier de')} ${validateAction.dossier.entite} ${t("sera renvoyé à l'émetteur. Le motif sera consigné dans le journal COBAC.")}`
                : `${t('Le dossier de')} ${validateAction.dossier.entite} ${t('sera archivé et la fiche partenaire activée. Une trace est conservée pendant 10 ans (Art. 38).')}`
            : ''
        }
        onConfirm={async (motif) => {
          if (validateAction) {
            const guid = guidByRef.get(validateAction.dossier.id);
            if (!guid) {
              notifyError(t('Action impossible'), { description: t('Dossier introuvable dans Dataverse.') });
              throw new Error('GUID introuvable');
            }
            // Double validation : niveau 3 PROPOSE (sans effet) ; niveau 1/2 valide effectivement.
            const canConfirm = can('dossiers.confirm');
            try {
              if (!canConfirm) {
                // Niveau 3 : on enregistre une proposition, le dossier reste « En revue ».
                await recordDecision(
                  validateAction.intent === 'reject' ? 'reject' : 'validate',
                  validateAction.dossier,
                  motif,
                  undefined,
                  747010000, // proposition (Chargé de conformité)
                );
                notifyInfo(t('Proposition soumise'), {
                  description: `${validateAction.dossier.entite} ${t('— votre')} ${validateAction.intent === 'reject' ? t('rejet') : t('validation')} ${t('doit être confirmé(e) par un responsable (page « Validation »).')}`,
                });
              } else if (validateAction.intent === 'reject') {
                // La réponse adressée au tiers est consignée dans le commentaire du dossier.
                const reponse = `Décision DCONF : Rejeté (${frToday()})${motif ? `\nMotif : ${motif}` : ''}`;
                await updateDossier.mutateAsync({
                  id: guid,
                  changes: {
                    afb_statutdudossier: STATUT_DOSSIER_TO_DV.rejeter,
                    afb_commentairedconf: reponse,
                  },
                });
                await recordDecision('reject', validateAction.dossier, motif, undefined, 747010001);
                notifyInfo(t('Dossier rejeté'), { description: `${validateAction.dossier.entite} · ${t('réponse transmise au tiers.')}` });
              } else {
                const reponse = `Décision DCONF : Validé (${frToday()})${motif ? `\nNote : ${motif}` : ''}`;
                await updateDossier.mutateAsync({
                  id: guid,
                  changes: {
                    afb_statutdudossier: STATUT_DOSSIER_TO_DV.valider,
                    afb_datededernierevalidation: new Date().toISOString(),
                    afb_commentairedconf: reponse,
                  },
                });
                await recordDecision('validate', validateAction.dossier, motif, undefined, 747010001);
                notifySuccess(t('Dossier validé'), {
                  description: `${validateAction.dossier.entite} ${t('archivé')}${motif ? ` ${t('avec commentaire')}` : ''}.`,
                });
              }
            } catch (e) {
              notifyError(t('Échec de la mise à jour'), {
                description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
              });
              throw e;
            }
            setOpenDossier(null);
          }
        }}
      />
    </div>
  );
}

/* =====================================================================
   Drawer dossier
   ===================================================================== */

function DossierDrawer({
  dossier,
  timeline,
  onClose,
  onAskComplement,
  onValidate,
  onReject,
}: {
  dossier: Dossier | null;
  timeline: TraceEvent[];
  onClose: () => void;
  onAskComplement: () => void;
  onValidate: () => void;
  onReject: () => void;
}) {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyError, notifyInfo } = useNotifications();
  const updateDoc = documents.useUpdate();
  // Documents réellement déposés par le partenaire (via le portail), filtrés sur son tiers.
  const tiersId = dossier?.tiersId;
  const { data: rawDocs } = documents.useList(
    {
      filter: tiersId ? `_afb_tiers_value eq ${tiersId}` : undefined,
      top: 200,
      orderBy: ['afb_datedeteleversement desc'],
    },
    { enabled: !!tiersId },
  );
  if (!dossier) return null;

  const entityType = inferEntityType(dossier);

  const fd = (v?: string) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
  };
  const DOC_STATUT: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: t('Validé'), color: '#15803D', bg: '#F0FDF4' },
    1: { label: t('En attente'), color: 'var(--warning)', bg: '#FFFBEB' },
    747010001: { label: t('Expiré'), color: 'var(--danger)', bg: 'var(--danger-bg)' },
    747010002: { label: t('Rejeté'), color: 'var(--danger)', bg: 'var(--danger-bg)' },
  };
  const partnerDocs = ((rawDocs ?? []) as unknown as Array<Record<string, unknown>>)
    // Exclut les marqueurs hors-KYC : réponses du tiers (facture/complément) et
    // demandes de document envoyées à AFB (traitées ailleurs / par e-mail).
    .filter((d) => {
      const type = String(d.afb_typededocument || '');
      return !type.startsWith('reponse:') && type !== 'demande-document';
    })
    .map((d) => ({
    id: d.afb_documentid as string,
    nom: (d.afb_nomdufichier as string) || (d.afb_typededocument as string) || t('Document'),
    type: (d.afb_typededocument as string) || '—',
    statut: d.afb_statutdevalidite as number | undefined,
    date: fd(d.afb_datedeteleversement as string | undefined),
    expiration: d.afb_datedexpiration ? fd(d.afb_datedexpiration as string) : '—',
    motifRejet: (d.afb_motifderejet as string) || undefined,
    url: (d.afb_urlsharepoint as string) || '',
  }));

  // Checklist des pièces attendues : fourni si un document déposé porte la clé
  // de la pièce (afb_typededocument = clé, ex. « rccm ») + compteur X/Y.
  const requiredList = parseRequiredDocs(dossier.requiredDocsJson, entityType);
  const providedKeys = new Set(partnerDocs.map((d) => d.type).filter(Boolean));
  const checklist = requiredList.map((item) => ({ ...item, fourni: providedKeys.has(item.key) }));
  const nbFournis = checklist.filter((c) => c.fourni).length;
  const docTypeLabel = (t: string) => requiredList.find((r) => r.key === t)?.name ?? t;

  // Ouvre / télécharge le document. Priorité à la pièce jointe (annotation),
  // lue via le connecteur Dataverse générique (getDocumentBinary) — fiable ;
  // repli sur l'URL SharePoint seulement si aucune annotation. Corrige le cas où
  // le téléchargement échouait (404 SharePoint) alors que le fichier existait,
  // et où le Code App « ne pouvait rien faire » sur les pièces déposées.
  const openDoc = async (doc: (typeof partnerDocs)[number], download: boolean) => {
    try {
      const f = await getDocumentBinary(doc.id, doc.url, doc.nom);
      const a = document.createElement('a');
      if (f.url) {
        a.href = f.url;
        a.target = '_blank';
        a.rel = 'noopener';
        if (download) a.download = doc.nom;
      } else {
        const blobUrl = URL.createObjectURL(base64ToBlob(f.base64 as string, f.mimetype as string));
        a.href = blobUrl;
        if (download) a.download = f.filename || doc.nom;
        else { a.target = '_blank'; a.rel = 'noopener'; }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      notifyInfo(t('Fichier introuvable'), {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Valide (0) ou rejette (747010002) un document — effectif dans Dataverse.
  const decideDoc = async (doc: (typeof partnerDocs)[number], valide: boolean) => {
    const motif = valide ? undefined : (window.prompt(t('Motif du rejet (transmis au partenaire) :')) ?? undefined);
    try {
      await updateDoc.mutateAsync({
        id: doc.id,
        changes: {
          afb_statutdevalidite: valide ? 0 : 747010002,
          ...(valide ? {} : { afb_motifderejet: motif || 'Document non conforme' }),
        } as unknown as Parameters<typeof updateDoc.mutateAsync>[0]['changes'],
      });
      if (valide) notifySuccess(t('Document validé'), { description: doc.nom });
      else notifyInfo(t('Document rejeté'), { description: `${doc.nom}${motif ? ` — ${motif}` : ''}` });
    } catch (e) {
      notifyError(t('Décision non enregistrée'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
    }
  };

  const badges: DrawerStatusBadge[] = [
    {
      label: dossier.statut,
      color:
        dossier.statut === 'Validé'
          ? 'success'
          : dossier.statut === 'Expiré' || dossier.statut === 'Rejeté'
          ? 'danger'
          : dossier.statut === 'En revue'
          ? 'warning'
          : 'subtle',
      appearance: 'tint',
    },
    {
      label: `${t('Risque')} ${dossier.risque}`,
      color: dossier.risque === 'High' ? 'danger' : dossier.risque === 'Medium' ? 'warning' : 'subtle',
      appearance: 'tint',
    },
    { label: dossier.type, color: 'brand', appearance: 'tint' },
    { label: dossier.direction, color: 'informative', appearance: 'tint' },
  ];

  const docsContent = (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <Button
          appearance="outline"
          size="small"
          icon={<ArrowDownload20Regular />}
          onClick={() =>
            downloadTiersReport({
              dossier,
              docs: partnerDocs.map((d) => ({
                nom: d.nom,
                type: docTypeLabel(d.type),
                statutLabel: DOC_STATUT[d.statut ?? 1]?.label ?? '—',
                date: d.date,
                expiration: d.expiration,
              })),
              checklist: checklist.map((c) => ({ name: c.name, fourni: c.fourni, mandatory: c.mandatory })),
            }).catch(() => notifyError(t('Rapport PDF'), { description: t('Génération impossible.') }))
          }
        >
          {t('Télécharger le rapport PDF')}
        </Button>
      </div>

      <DrawerSection
        title={t('Identification')}
        description={`${entityTypeLabels[entityType]} ${t('— règle de validité par défaut')} ${entityTypeValidityMonths[entityType]} ${t('mois.')}`}
      >
        <FieldGrid
          items={[
            { label: t('Référence'), value: dossier.id, mono: true },
            { label: t('Responsable'), value: dossier.charge ?? '—' },
            { label: t('Direction porteuse'), value: dossier.direction },
            { label: t('Pays'), value: dossier.pays ?? '—' },
            { label: t('Date de création'), value: dossier.dateCreation },
          ]}
        />
      </DrawerSection>

      <DrawerSection
        title={t("Fiche d'onboarding")}
        description={t('Informations déclarées par le partenaire lors de son inscription au portail.')}
      >
        <FieldGrid
          items={[
            { label: t('Raison sociale'), value: dossier.entite },
            { label: t('Forme juridique'), value: dossier.onboarding?.formeJuridique ?? '—' },
            { label: t("Secteur d'activité"), value: dossier.onboarding?.secteur ?? '—' },
            { label: t('RCCM / Immatriculation'), value: dossier.onboarding?.rccm ?? '—' },
            { label: t('Pays'), value: dossier.pays ?? '—' },
            { label: t('Ville'), value: dossier.onboarding?.ville ?? '—' },
            { label: t('Adresse complète'), value: dossier.onboarding?.adresse ?? '—' },
            { label: t('E-mail de contact'), value: dossier.email ?? '—' },
            { label: t('Téléphone'), value: dossier.onboarding?.telephone ?? '—' },
            { label: t('Code SWIFT / BIC'), value: dossier.onboarding?.swift ?? '—' },
          ]}
        />
      </DrawerSection>

      <DrawerSection title={t('Profil de risque composite')}>
        <div className={styles.riskGrid}>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>{t('KYC / AML')}</div>
            <RisqueBadge risque={dossier.risque} />
          </div>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>{t('Éthique')}</div>
            <RisqueBadge risque={entityType === 'intragroupe' ? 'High' : 'Low'} />
          </div>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>{t('Fiscal')}</div>
            <RisqueBadge risque={entityType === 'intragroupe' ? 'High' : 'Low'} />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection
        title={t('Documents déposés par le partenaire')}
        description={
          partnerDocs.length
            ? `${partnerDocs.length} ${t('pièce(s) transmise(s) via le portail — versionnées dans le coffre numérique.')}`
            : t('Aucune pièce transmise pour le moment.')
        }
      >
        {partnerDocs.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#737373', margin: 0 }}>
            {t("Le partenaire n'a encore déposé aucun document sur son espace.")}
          </p>
        ) : (
          <div className={styles.docList}>
            {partnerDocs.map((doc) => {
              const st = DOC_STATUT[doc.statut ?? 1] ?? { label: '—', color: '#737373', bg: '#F5F5F5' };
              return (
                <div key={doc.id} className={styles.docRow}>
                  <div className={styles.docName}>
                    {doc.nom}
                    <span className={styles.docHint}>
                      {' · '}
                      {docTypeLabel(doc.type)}
                      {` · ${t('déposé le')} `}
                      {doc.date}
                      {doc.expiration !== '—' ? ` · ${t('expire le')} ${doc.expiration}` : ''}
                      {doc.motifRejet ? ` · ${t('motif :')} ${doc.motifRejet}` : ''}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: st.color,
                      backgroundColor: st.bg,
                      padding: '3px 9px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {st.label}
                  </span>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0, marginLeft: '4px' }}>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Eye20Regular />}
                      title={t('Voir le document')}
                      onClick={() => openDoc(doc, false)}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<ArrowDownload20Regular />}
                      title={t('Télécharger')}
                      onClick={() => openDoc(doc, true)}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<CheckmarkCircle20Regular />}
                      title={t('Valider ce document')}
                      onClick={() => decideDoc(doc, true)}
                      style={{ color: '#15803D' }}
                      disabled={updateDoc.isPending || doc.statut === 0}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<DismissCircle20Regular />}
                      title={t('Rejeter ce document')}
                      onClick={() => decideDoc(doc, false)}
                      style={{ color: 'var(--accent)' }}
                      disabled={updateDoc.isPending || doc.statut === 747010002}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DrawerSection>

      <DrawerSection
        title={`${t('Pièces attendues ·')} ${entityTypeLabels[entityType]}`}
        description={`${nbFournis}/${checklist.length} ${t("pièces fournies — suivi des documents obligatoires pour ce type d'entité.")}`}
      >
        <div className={styles.docList}>
          {checklist.map((c) => (
            <div key={c.key} className={styles.docRow}>
              {c.fourni ? (
                <CheckmarkCircle20Filled style={{ color: '#15803D', flexShrink: 0 }} />
              ) : (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `2px solid ${c.mandatory ? 'var(--accent)' : '#D1D5DB'}`,
                    flexShrink: 0,
                  }}
                />
              )}
              <div className={styles.docName} style={{ color: c.fourni ? '#404040' : '#737373' }}>
                {c.name}
                {c.hint && <span className={styles.docHint}> · {c.hint}</span>}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  color: c.fourni ? '#15803D' : c.mandatory ? 'var(--accent)' : '#737373',
                  backgroundColor: c.fourni ? '#F0FDF4' : c.mandatory ? 'var(--danger-bg)' : '#F5F5F5',
                }}
              >
                {c.fourni ? t('Fourni') : c.mandatory ? t('Manquant') : t('Optionnel')}
              </span>
            </div>
          ))}
        </div>
      </DrawerSection>

      {/* Conclusion — statut & réponse DCONF, tout en bas. */}
      <DrawerSection
        title={t('Statut & réponse DCONF')}
        description={t('Conclusion du dossier — décision en cours et dernier commentaire transmis au tiers.')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#737373' }}>{t('Statut :')}</span>
          <StatutBadge statut={dossier.statut} />
        </div>
        <div
          style={{
            fontSize: '13px',
            color: dossier.commentaire ? '#404040' : '#A3A3A3',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            padding: '12px 14px',
            backgroundColor: '#FAF9F6',
            border: '1px solid #ECEAE4',
            borderRadius: '10px',
          }}
        >
          {dossier.commentaire ?? t('Aucun commentaire enregistré pour ce dossier.')}
        </div>
      </DrawerSection>
    </>
  );

  const auditContent = (
    <DrawerSection
      title={t('Journal de traçabilité')}
      description={t('Trace non modifiable — Art. 38 COBAC. Conservée 10 ans.')}
    >
      {timeline.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#737373', margin: 0 }}>
          {t("Aucune action enregistrée pour ce dossier dans le journal d'audit.")}
        </p>
      ) : (
        <DrawerTimeline
          events={timeline.map((e) => ({
            when: e.when ? new Date(e.when).toLocaleString('fr-FR') : '—',
            title: e.title,
            author: e.author,
            detail: e.detail,
          }))}
        />
      )}
    </DrawerSection>
  );

  return (
    <DetailDrawer
      open={!!dossier}
      onClose={onClose}
      eyebrow={`${entityTypeLabels[entityType]}`}
      title={dossier.entite}
      subtitle={`${dossier.id} · ${t('validité par défaut')} ${entityTypeValidityMonths[entityType]} ${t('mois')}`}
      size="large"
      statusBadges={badges}
      tabs={[
        { key: 'docs', label: t('Documents'), count: partnerDocs.length, content: docsContent },
        { key: 'audit', label: t('Journal de traçabilité'), content: auditContent },
      ]}
      footer={
        <>
          <Button appearance="outline" icon={<Mail20Regular />} onClick={onAskComplement}>
            {t('Demander complément')}
          </Button>
          <Button
            appearance="primary"
            icon={<DismissCircle20Regular />}
            onClick={onReject}
            style={{ backgroundColor: 'var(--accent)', borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)'}}
          >
            {t('Rejeter')}
          </Button>
          <Button appearance="primary" icon={<CheckmarkCircle20Regular />} onClick={onValidate}>
            {t('Valider')}
          </Button>
        </>
      }
    />
  );
}

/* =====================================================================
   Nouveau dossier
   ===================================================================== */

function NewDossierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (label: string, ref: string, email: string) => void;
}) {
  const styles = useStyles();
  const { t } = useT();
  const { notifyError } = useNotifications();
  const createDossier = dossiersKypKys.useCreate();
  const createTiers = tiersHooks.useCreate();
  const { data: ptData } = partnerTypes.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });
  // Type de partenaire choisi dans le référentiel Dataverse (GUID afb_partnertype).
  const [typeId, setTypeId] = useState<string>('');
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [pays, setPays] = useState('Cameroun');
  const [chargeId, setChargeId] = useState('');
  const [email, setEmail] = useState('');

  // Type de partenaire sélectionné + EntityType dérivé (checklist / validité / préfixe).
  const selectedPt = (ptData ?? []).find((p) => p.afb_partnertypeid === typeId);
  const type: EntityType | null = selectedPt
    ? entityTypeFromFamille(selectedPt.afb_familledinstitution)
    : null;

  // Checklist des pièces requises, éditable (pré-remplie par le type choisi).
  const [checklist, setChecklist] = useState<RequiredDoc[]>([]);
  const [newDocName, setNewDocName] = useState('');
  useEffect(() => {
    setChecklist(type ? requiredDocsByType[type].map((d) => ({ ...d })) : []);
  }, [type]);
  const toggleMandatory = (i: number) =>
    setChecklist((l) => l.map((d, idx) => (idx === i ? { ...d, mandatory: !d.mandatory } : d)));
  const removeDoc = (i: number) => setChecklist((l) => l.filter((_, idx) => idx !== i));
  const addDoc = () => {
    const name = newDocName.trim();
    if (!name) return;
    const key = 'c' + name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) + String(checklist.length);
    setChecklist((l) => [...l, { key, name, mandatory: true }]);
    setNewDocName('');
  };

  const reset = () => {
    setTypeId('');
    setNom('');
    setContact('');
    setPays('Cameroun');
    setChargeId('');
    setEmail('');
    setChecklist([]);
    setNewDocName('');
  };

  const valid =
    !!typeId &&
    nom.trim().length >= 3 &&
    pays.trim().length > 0 &&
    chargeId !== '' &&
    /^\S+@\S+\.\S+$/.test(email);

  const submit = async () => {
    if (!type || !typeId) return;
    const prefix =
      type === 'correspondant' ? 'KYC-B'
      : type === 'partenaire' ? 'KYP'
      : type === 'fournisseur' ? 'KYS'
      : 'KYI';
    const ref = `${prefix}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    try {
      // 1) Création du tiers porteur de l'identité.
      const newTiers = await createTiers.mutateAsync({
        afb_nomdupartenaire: nom.trim(),
        afb_pays: pays.trim(),
        afb_directionporteuse: 1, // DCONF par défaut
        afb_niveauderisque: 2, // Standard par défaut (peut être affiné ultérieurement)
        afb_statutdutiers: 0, // Partenaireactif
        afb_datedecreationsysteme: new Date().toISOString(),
        // Liste des pièces requises personnalisée (JSON) — lue par le portail et le détail dossier.
        afb_documentsrequis: JSON.stringify(
          checklist.map(({ key, name, mandatory }) => ({ key, name, mandatory })),
        ),
        ...(email ? { afb_emailcontactprincipal: email } : {}),
        'afb_typejuridique@odata.bind': `/afb_partnertypes(${typeId})`,
        'afb_chargederelation@odata.bind': `/afb_utilisateurinternes(${chargeId})`,
      } as unknown as Parameters<typeof createTiers.mutateAsync>[0]);

      // 2) Création du dossier rattaché à ce tiers.
      await createDossier.mutateAsync({
        afb_referencedudossier: ref,
        afb_statutdudossier: 1, // En revue → visible dans la file de validation
        afb_tauxdecompletude: 0,
        afb_versiondudossier: 1,
        afb_datedesoumission: new Date().toISOString(),
        'afb_nomdutiers@odata.bind': `/afb_tierses(${newTiers.afb_tiersid})`,
      } as unknown as Parameters<typeof createDossier.mutateAsync>[0]);

      // 3) Affecte automatiquement le(s) questionnaire(s) selon le type du tiers.
      await assignQuestionnairesForTiers(
        newTiers.afb_tiersid,
        selectedPt?.afb_codeinstitution,
        (userData ?? [])[0]?.afb_utilisateurinterneid,
      );

      onCreated(entityTypeLabels[type], ref, email);
      reset();
    } catch (e) {
      notifyError(t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
      throw e;
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      eyebrow={t('Nouveau dossier de conformité')}
      title={t('Sélectionnez la cible')}
      subtitle={t("Les documents requis et la durée de validité par défaut s'adaptent automatiquement au type d'entité.")}
      size="large"
      submitLabel={t("Créer & envoyer l'invitation")}
      submitDisabled={!valid}
      onSubmit={submit}
    >
      <FormSection title={t('Type de cible')} description={t('Choisissez le type de partenaire issu du référentiel — chaque type embarque sa propre checklist KYC et sa durée de validité.')}>
        <Field
          label={t('Type de partenaire')}
          required
          hint={
            type
              ? `${t('Validité par défaut')} ${entityTypeValidityMonths[type]} ${t('mois.')}`
              : t('Référentiel « Types de partenaires » (Dataverse).')
          }
        >
          <Dropdown
            placeholder={t('Sélectionner un type de partenaire')}
            value={selectedPt?.afb_libellefrancais ?? ''}
            selectedOptions={typeId ? [typeId] : []}
            onOptionSelect={(_, d) => d.optionValue && setTypeId(d.optionValue)}
          >
            {(ptData ?? []).map((p) => (
              <Option key={p.afb_partnertypeid} value={p.afb_partnertypeid} text={p.afb_libellefrancais}>
                {p.afb_libellefrancais}
                {p.afb_codeinstitution ? ` · ${p.afb_codeinstitution}` : ''}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </FormSection>

      <FormSection title={t('Identité du tiers')} description={t("Renseignez la raison sociale, le pays et le contact principal qui recevra l'invitation sécurisée.")}>
        <FieldRow cols={2}>
          <Field label={t('Raison sociale')} required>
            <Input value={nom} onChange={(_, d) => setNom(d.value)} placeholder={t('Ex. SOCAPALM SA')} />
          </Field>
          <Field label={t('Nom du contact')}>
            <Input value={contact} onChange={(_, d) => setContact(d.value)} placeholder={t('Ex. M. Eboa')} />
          </Field>
        </FieldRow>
        <FieldRow cols={2}>
          <Field label={t('Pays')} required>
            <Dropdown
              value={pays}
              selectedOptions={[pays]}
              onOptionSelect={(_, d) => d.optionValue && setPays(d.optionValue)}
            >
              {COUNTRIES.map((c) => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Dropdown>
          </Field>
          <Field label={t('Chargé de relation')} required hint={t('Utilisateur interne responsable du tiers.')}>
            <Dropdown
              placeholder={t('Sélectionner un chargé')}
              value={userData?.find((u) => u.afb_utilisateurinterneid === chargeId)?.afb_nomcomplet ?? ''}
              selectedOptions={chargeId ? [chargeId] : []}
              onOptionSelect={(_, d) => d.optionValue && setChargeId(d.optionValue)}
            >
              {(userData ?? []).map((u) => (
                <Option key={u.afb_utilisateurinterneid} value={u.afb_utilisateurinterneid}>
                  {u.afb_nomcomplet}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </FieldRow>
        <Field label={t('Email du destinataire')} required hint={t("Le tiers recevra le lien d'onboarding sur cette adresse (validité 72 h).")}>
          <Input
            type="email"
            value={email}
            onChange={(_, d) => setEmail(d.value)}
            placeholder="contact@entreprise.com"
            contentBefore={<Mail20Regular style={{ color: '#737373' }} />}
          />
        </Field>
      </FormSection>

      {type && (
        <FormSection
          title={`${t('Documents requis ·')} ${entityTypeLabels[type]}`}
          description={t('Personnalisez la liste : basculez Obligatoire/Optionnel, ajoutez ou retirez des pièces. Le partenaire la verra dans son espace.')}
        >
          <div className={styles.docList}>
            {checklist.map((d, i) => (
              <div key={d.key} className={styles.docRow}>
                <DocumentText20Regular style={{ color: '#737373', flexShrink: 0 }} />
                <div className={styles.docName}>
                  {d.name}
                  {d.hint && <span className={styles.docHint}> · {d.hint}</span>}
                </div>
                <Button
                  size="small"
                  appearance={d.mandatory ? 'primary' : 'outline'}
                  onClick={() => toggleMandatory(i)}
                  style={d.mandatory ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
                >
                  {d.mandatory ? t('Obligatoire') : t('Optionnel')}
                </Button>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<DismissCircle20Regular style={{ color: 'var(--accent)' }} />}
                  title={t('Retirer cette pièce')}
                  onClick={() => removeDoc(i)}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <Input
              placeholder={t('Ajouter une pièce (ex. Attestation CNPS)…')}
              value={newDocName}
              onChange={(_, d) => setNewDocName(d.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoc(); } }}
              style={{ flex: 1 }}
            />
            <Button appearance="outline" icon={<Add20Regular />} disabled={!newDocName.trim()} onClick={addDoc}>
              {t('Ajouter')}
            </Button>
          </div>
        </FormSection>
      )}
    </FormDialog>
  );
}

/* =====================================================================
   Demande de complément
   ===================================================================== */

function ComplementDialog({
  open,
  onOpenChange,
  dossier,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dossier: Dossier;
  onSent: (payload: { deadline: string; message: string }) => void | Promise<void>;
}) {
  const styles = useStyles();
  const { t } = useT();
  const entityType = inferEntityType(dossier);

  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState(
    `Bonjour,\n\nDans le cadre de l'instruction du dossier ${dossier.id} (${dossier.entite}), nous vous invitons à compléter les éléments ci-dessous :\n\n- \n- \n\nMerci de nous les transmettre dans les meilleurs délais.\n\nCordialement,\nDirection de la Conformité — Afriland First Bank`,
  );

  const reset = () => {
    setDeadline('');
  };

  const valid = message.trim().length >= 10;

  const submit = async () => {
    await onSent({ deadline, message });
    reset();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      eyebrow={t("Demande de complément d'informations")}
      title={dossier.entite}
      subtitle={`${dossier.id} · ${entityTypeLabels[entityType]}`}
      size="large"
      submitLabel={t('Envoyer la demande')}
      submitDisabled={!valid}
      onSubmit={submit}
    >
      <FormSection
        title={t('Destinataire & échéance')}
        description={t("L'e-mail est envoyé automatiquement à l'adresse enregistrée du tiers (via Power Automate). Aucune saisie d'adresse n'est nécessaire.")}
      >
        <FieldRow cols={2}>
          <Field label={t('Destinataire (enregistré)')}>
            <Input
              readOnly
              value={dossier.email ?? t('Aucune adresse enregistrée sur le tiers')}
              contentBefore={<Mail20Regular style={{ color: '#737373' }} />}
            />
          </Field>
          <Field label={t('Échéance souhaitée')}>
            <Input
              type="date"
              value={deadline}
              onChange={(_, d) => setDeadline(d.value)}
              contentBefore={<Calendar20Regular style={{ color: '#737373' }} />}
            />
          </Field>
        </FieldRow>
      </FormSection>

      <FormSection
        title={t('Message au destinataire')}
        description={t('Indiquez les pièces ou informations à compléter et toute précision utile — ce texte est envoyé tel quel au tiers.')}
      >
        <Field label={t('Message')}>
          <Textarea
            value={message}
            onChange={(_, d) => setMessage(d.value)}
            rows={9}
            resize="vertical"
          />
        </Field>
        <div className={styles.helperBanner} style={{ marginTop: '12px' }}>
          <CheckmarkCircle20Filled style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
          <span>
            {t('À l\'envoi, le dossier passe en statut « à compléter » et le tiers est notifié par e-mail à son adresse enregistrée.')}
          </span>
        </div>
      </FormSection>
    </FormDialog>
  );
}
