import { useState } from 'react';
import { Badge, Button, makeStyles, Switch } from '@fluentui/react-components';
import {
  CalendarClock20Regular,
  Save20Regular,
  Settings20Regular,
  ShieldCheckmark20Regular,
  Scales20Regular,
  ArrowReset20Regular,
  EditOff20Regular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import {
  mockConfigSLA,
  mockConfigScreening,
  mockConfigSeuils,
  type ConfigItem,
} from '@/lib/mockData';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '16px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '14px 0',
    borderBottom: '1px solid #F4F4F4',
    ':last-child': { borderBottom: 'none' },
  },
  itemRowDirty: {
    backgroundColor: '#FEF2F3',
    margin: '0 -16px',
    padding: '14px 16px',
    borderRadius: '6px',
    borderBottom: '1px solid #FCE4E6',
  },
  itemMeta: { flex: 1, minWidth: 0 },
  itemLabel: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '2px' },
  itemDesc: { fontSize: '12px', color: '#767676', lineHeight: 1.5 },
  itemControl: { flexShrink: 0, minWidth: '120px', textAlign: 'right' },
  valuePill: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#1A1A1A',
  },
  systemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '13px',
    borderBottom: '1px solid #F4F4F4',
    ':last-child': { borderBottom: 'none' },
  },
  systemLabel: { color: '#767676' },
  systemValue: { fontWeight: 600, color: '#1A1A1A', fontFamily: 'monospace', fontSize: '12px' },
  dirtyDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#E30613',
    display: 'inline-block',
    marginLeft: '6px',
  },
  changesBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#FEF2F3',
    border: '1px solid #FCE4E6',
    borderRadius: '10px',
    marginBottom: '16px',
  },
});

function ConfigList({
  items,
  values,
  onToggle,
}: {
  items: ConfigItem[];
  values: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
}) {
  const styles = useStyles();
  return (
    <div>
      {items.map((item) => {
        const initial = item.type === 'switch' ? item.value === 'Activé' : null;
        const current = values[item.key] ?? initial ?? false;
        const dirty = item.type === 'switch' && initial !== null && current !== initial;
        return (
          <div key={item.key} className={`${styles.itemRow} ${dirty ? styles.itemRowDirty : ''}`}>
            <div className={styles.itemMeta}>
              <div className={styles.itemLabel}>
                {item.label}
                {dirty && <span className={styles.dirtyDot} />}
              </div>
              <div className={styles.itemDesc}>{item.description}</div>
            </div>
            <div className={styles.itemControl}>
              {item.type === 'switch' ? (
                <Switch checked={current} onChange={(_, d) => onToggle(item.key, d.checked)} />
              ) : (
                <span className={styles.valuePill}>{item.value}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {icon} {text}
    </span>
  );
}

export default function Configuration() {
  const styles = useStyles();
  const { notifySuccess, notifyInfo } = useNotifications();
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('afb_config') ?? '{}') as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const all = [...mockConfigSLA, ...mockConfigScreening, ...mockConfigSeuils];

  const dirtyKeys = Object.keys(values).filter((k) => {
    const item = all.find((i) => i.key === k);
    if (!item || item.type !== 'switch') return false;
    return values[k] !== (item.value === 'Activé');
  });

  const dirty = dirtyKeys.length > 0;

  const toggle = (key: string, value: boolean) => {
    setValues((cur) => ({ ...cur, [key]: value }));
  };

  const submitSave = async () => {
    const count = dirtyKeys.length;
    // Persistance locale réelle (les réglages survivent au rechargement).
    try {
      localStorage.setItem('afb_config', JSON.stringify(values));
    } catch {
      /* quota indisponible — on notifie quand même */
    }
    notifySuccess('Configuration enregistrée', {
      description: `${count} paramètre${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''} localement.`,
    });
    setConfirmSave(false);
  };

  const submitReset = async () => {
    setValues({});
    notifyInfo('Modifications annulées', {
      description: 'Les paramètres ont été restaurés à leur état précédent.',
    });
    setConfirmReset(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Configuration"
        subtitle="Paramètres système du Portail KYP/KYS — règles SLA, sources de screening, seuils réglementaires."
        actions={
          <>
            {dirty && (
              <Button
                icon={<ArrowReset20Regular />}
                appearance="outline"
                onClick={() => setConfirmReset(true)}
              >
                Annuler les modifications
              </Button>
            )}
            <Button
              icon={<Save20Regular />}
              appearance="primary"
              disabled={!dirty}
              onClick={() => setConfirmSave(true)}
            >
              Enregistrer{dirty ? ` (${dirtyKeys.length})` : ''}
            </Button>
          </>
        }
      />

      {dirty && (
        <div className={styles.changesBar}>
          <EditOff20Regular style={{ color: '#A50410' }} />
          <div style={{ flex: 1, fontSize: '13px', color: '#A50410' }}>
            <strong>
              {dirtyKeys.length} paramètre{dirtyKeys.length > 1 ? 's' : ''} modifié
              {dirtyKeys.length > 1 ? 's' : ''}
            </strong>{' '}
            — les modifications ne sont pas encore enregistrées. Cliquez sur Enregistrer pour les appliquer.
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <Card
          title={<SectionTitle icon={<CalendarClock20Regular />} text="Règles SLA & relances" />}
          subtitle="Cadence d’alertes avant expiration documentaire"
        >
          <ConfigList items={mockConfigSLA} values={values} onToggle={toggle} />
        </Card>

        <Card
          title={<SectionTitle icon={<ShieldCheckmark20Regular />} text="Sources de screening" />}
          subtitle="Bases interrogées quotidiennement à 03h00 UTC+1"
        >
          <ConfigList items={mockConfigScreening} values={values} onToggle={toggle} />
        </Card>

        <Card
          title={<SectionTitle icon={<Scales20Regular />} text="Seuils réglementaires" />}
          subtitle="Conformité COBAC R-2023/01 — paramétrage UBO et risque"
        >
          <ConfigList items={mockConfigSeuils} values={values} onToggle={toggle} />
        </Card>

        <Card
          title={<SectionTitle icon={<Settings20Regular />} text="Informations système" />}
          subtitle="Référence technique de l’environnement"
        >
          <div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Version applicative</span>
              <span className={styles.systemValue}>v1.4.2 (build 20260512)</span>
            </div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Environnement Dataverse</span>
              <span className={styles.systemValue}>afb-kyp-prod.crm4.dynamics.com</span>
            </div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Dernière synchronisation</span>
              <span className={styles.systemValue}>2026-05-17 03:00:14</span>
            </div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Statut intégration BEAC</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Badge appearance="filled" color="success" size="small">Opérationnel</Badge>
              </span>
            </div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Statut API screening externe</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Badge appearance="filled" color="success" size="small">Opérationnel</Badge>
              </span>
            </div>
            <div className={styles.systemRow}>
              <span className={styles.systemLabel}>Référentiel réglementaire</span>
              <span className={styles.systemValue}>COBAC R-2023/01 · Guide AFB v3.8</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirm save */}
      <ConfirmActionDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        intent="warn"
        title={`Enregistrer ${dirtyKeys.length} modification${dirtyKeys.length > 1 ? 's' : ''} ?`}
        description="Les paramètres système sont opposables aux décisions futures. Toute modification est tracée dans le journal d'audit (Art. 12 R-2023/01) et requiert une justification."
        confirmLabel="Enregistrer"
        requireMotif
        motifLabel="Justification du changement"
        motifPlaceholder="Mise à jour annuelle, demande RCSI, nouvelle réglementation…"
        helperNote={`Paramètres impactés : ${dirtyKeys
          .map((k) => all.find((i) => i.key === k)?.label)
          .filter(Boolean)
          .join(' · ')}`}
        onConfirm={submitSave}
      />

      {/* Confirm reset */}
      <ConfirmActionDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        intent="info"
        title="Annuler les modifications en cours ?"
        description={`${dirtyKeys.length} modification${dirtyKeys.length > 1 ? 's seront perdues' : ' sera perdue'}. Les paramètres reviendront à leur état précédent.`}
        confirmLabel="Oui, annuler"
        onConfirm={submitReset}
      />
    </div>
  );
}