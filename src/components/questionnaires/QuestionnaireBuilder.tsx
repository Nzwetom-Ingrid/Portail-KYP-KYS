/**
 * Builder de questions d'un questionnaire : ajoute / édite / supprime des
 * sections et des questions (afb_questionnairesection / afb_question), avec
 * création automatique des options pour les types Oui/Non et Statut.
 */
import { useMemo, useState } from 'react';
import { Button, Input, Dropdown, Option, Switch, Badge, Spinner, Tooltip } from '@fluentui/react-components';
import {
  Add20Regular,
  Edit20Regular,
  Delete20Regular,
  Save20Regular,
  Dismiss20Regular,
  ArrowUpload20Regular,
  ArrowDownload20Regular,
} from '@fluentui/react-icons';
import { questionnaireSections, questions as questionsHooks, questionOptions } from '@/lib/dataverse/entityHooks';
import { useNotifications } from '@/components/common/NotificationProvider';
import type { Afb_questionnairesections } from '@/generated/models/Afb_questionnairesectionsModel';
import type { Afb_questions } from '@/generated/models/Afb_questionsModel';

const Q_TYPES: { value: number; label: string }[] = [
  { value: 0, label: 'Texte court' },
  { value: 747010001, label: 'Texte long' },
  { value: 1, label: 'Oui / Non' },
  { value: 747010002, label: 'Choix unique' },
  { value: 747010003, label: 'Choix multiples' },
  { value: 4, label: 'Numérique' },
  { value: 747010004, label: 'Date' },
  { value: 2, label: 'Pièce jointe' },
  { value: 3, label: 'Tableau' },
  { value: 747010005, label: 'Statut (C/PC/NC/NA)' },
];
const typeLabel = (v: number | undefined) => Q_TYPES.find((t) => t.value === v)?.label ?? 'Texte court';

/** Options à créer automatiquement selon le type de question. */
function optionsForType(v: number): { libelle: string; valeur: string; ordre: number }[] {
  if (v === 1) {
    return [
      { libelle: 'Oui', valeur: 'Oui', ordre: 1 },
      { libelle: 'Non', valeur: 'Non', ordre: 2 },
    ];
  }
  if (v === 747010005) {
    return [
      { libelle: 'Conforme (C)', valeur: 'C', ordre: 1 },
      { libelle: 'Partiellement conforme (PC)', valeur: 'PC', ordre: 2 },
      { libelle: 'Non conforme (NC)', valeur: 'NC', ordre: 3 },
      { libelle: 'Non applicable (NA)', valeur: 'NA', ordre: 4 },
    ];
  }
  return [];
}

// Import CSV : tokens de type acceptés → code Dataverse.
const TYPE_TOKENS: Record<string, number> = {
  'texte court': 0, texte: 0, court: 0,
  'texte long': 747010001, long: 747010001,
  'oui/non': 1, 'oui-non': 1, ouinon: 1, 'oui non': 1, booleen: 1, boolean: 1,
  'choix unique': 747010002, choix: 747010002,
  'choix multiple': 747010003, 'choix multiples': 747010003,
  numerique: 4, 'numérique': 4, nombre: 4, number: 4,
  date: 747010004,
  'piece jointe': 2, 'pièce jointe': 2, fichier: 2, piece: 2,
  tableau: 3,
  statut: 747010005, 'c/pc/nc/na': 747010005,
};
const mapType = (token: string): number => TYPE_TOKENS[token.trim().toLowerCase()] ?? 0;
const isOui = (token: string): boolean => ['oui', 'o', 'true', '1', 'yes', 'x'].includes(token.trim().toLowerCase());

/** Parseur CSV minimal gérant les champs entre guillemets et les virgules internes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',' || c === ';') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

type SecForm = { id?: string; intitule: string };
type QForm = { id?: string; sectionId: string; libelle: string; type: number; obligatoire: boolean };

export function QuestionnaireBuilder({ questionnaireId }: { questionnaireId: string | undefined }) {
  const { notifySuccess, notifyError } = useNotifications();
  const { data: rawSections, isLoading: secLoading } = questionnaireSections.useList({ top: 1000 });
  const { data: rawQuestions, isLoading: qLoading } = questionsHooks.useList({ top: 2000 });
  const createSection = questionnaireSections.useCreate();
  const updateSection = questionnaireSections.useUpdate();
  const deleteSectionM = questionnaireSections.useDelete();
  const createQuestion = questionsHooks.useCreate();
  const updateQuestion = questionsHooks.useUpdate();
  const deleteQuestionM = questionsHooks.useDelete();
  const createOption = questionOptions.useCreate();

  const sections = useMemo<Afb_questionnairesections[]>(
    () =>
      (rawSections ?? [])
        .filter((s) => s._afb_questionnaireassocie_value === questionnaireId)
        .sort((a, b) => (a.afb_numerodordre ?? 0) - (b.afb_numerodordre ?? 0)),
    [rawSections, questionnaireId],
  );
  const questionsBySection = useMemo(() => {
    const m = new Map<string, Afb_questions[]>();
    for (const q of rawQuestions ?? []) {
      const sid = q._afb_section_value;
      if (!sid) continue;
      const arr = m.get(sid);
      if (arr) arr.push(q);
      else m.set(sid, [q]);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.afb_numerodordre ?? 0) - (b.afb_numerodordre ?? 0));
    return m;
  }, [rawQuestions]);

  const [secForm, setSecForm] = useState<SecForm | null>(null);
  const [qForm, setQForm] = useState<QForm | null>(null);
  const [busy, setBusy] = useState(false);

  if (!questionnaireId) {
    return <p style={{ fontSize: 13, color: '#737373' }}>Questionnaire introuvable.</p>;
  }
  if (secLoading || qLoading) return <Spinner size="tiny" label="Chargement des questions…" />;

  const saveSection = async () => {
    if (!secForm) return;
    const intitule = secForm.intitule.trim();
    if (!intitule) return;
    setBusy(true);
    try {
      if (secForm.id) {
        await updateSection.mutateAsync({
          id: secForm.id,
          changes: { afb_intituleenfrancais: intitule, afb_intituleenanglais: intitule } as unknown as Parameters<
            typeof updateSection.mutateAsync
          >[0]['changes'],
        });
      } else {
        const order = sections.length ? Math.max(...sections.map((s) => s.afb_numerodordre ?? 0)) + 1 : 1;
        await createSection.mutateAsync({
          afb_intituleenfrancais: intitule,
          afb_intituleenanglais: intitule,
          afb_numerodordre: order,
          'afb_questionnaireassocie@odata.bind': `/afb_questionnaires(${questionnaireId})`,
        } as unknown as Parameters<typeof createSection.mutateAsync>[0]);
      }
      setSecForm(null);
      notifySuccess('Section enregistrée');
    } catch (e) {
      notifyError('Section non enregistrée', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
    } finally {
      setBusy(false);
    }
  };

  const saveQuestion = async () => {
    if (!qForm) return;
    const libelle = qForm.libelle.trim();
    if (!libelle) return;
    setBusy(true);
    try {
      if (qForm.id) {
        await updateQuestion.mutateAsync({
          id: qForm.id,
          changes: {
            afb_libelleenfrancais: libelle,
            afb_libelleenanglais: libelle,
            afb_typedequestion: qForm.type,
            afb_obligatoire: qForm.obligatoire ? 0 : 747010001,
            afb_piecejointerequise: qForm.type === 2 ? 0 : 1,
          } as unknown as Parameters<typeof updateQuestion.mutateAsync>[0]['changes'],
        });
      } else {
        const inSec = questionsBySection.get(qForm.sectionId) ?? [];
        const order = inSec.length ? Math.max(...inSec.map((q) => q.afb_numerodordre ?? 0)) + 1 : 1;
        const created = await createQuestion.mutateAsync({
          afb_codedelaquestion: `Q-${Date.now()}`,
          afb_libelleenfrancais: libelle,
          afb_libelleenanglais: libelle,
          afb_numerodordre: order,
          afb_obligatoire: qForm.obligatoire ? 0 : 747010001,
          afb_piecejointerequise: qForm.type === 2 ? 0 : 1,
          afb_typedequestion: qForm.type,
          'afb_section@odata.bind': `/afb_questionnairesections(${qForm.sectionId})`,
        } as unknown as Parameters<typeof createQuestion.mutateAsync>[0]);
        const qid = created.afb_questionid;
        for (const o of optionsForType(qForm.type)) {
          await createOption.mutateAsync({
            afb_libelleenfrancais: o.libelle,
            afb_libelleenanglais: o.libelle,
            afb_valeurstockee: o.valeur,
            afb_ordredaffichage: o.ordre,
            'afb_identifiantdelaquestion@odata.bind': `/afb_questions(${qid})`,
          } as unknown as Parameters<typeof createOption.mutateAsync>[0]);
        }
      }
      setQForm(null);
      notifySuccess('Question enregistrée');
    } catch (e) {
      notifyError('Question non enregistrée', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      'section,libelle,type,obligatoire\n' +
      'I. Informations generales,Raison sociale de l\'entite,Texte court,oui\n' +
      'I. Informations generales,L\'entite est-elle cotee en bourse ?,Oui/Non,oui\n' +
      'II. Conformite,Disposez-vous d\'une politique LCB-FT ?,Oui/Non,oui\n' +
      'II. Conformite,Decrire le dispositif de controle,Texte long,non\n';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File | undefined) => {
    if (!file || !questionnaireId) return;
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) {
        notifyError('CSV vide');
        return;
      }
      // En-tête détecté si la 1re ligne contient « section » / « libelle ».
      const head = rows[0].map((c) => c.trim().toLowerCase());
      const start = head.includes('section') || head.includes('libelle') || head.includes('libellé') ? 1 : 0;
      const parsed = rows
        .slice(start)
        .map((r) => ({
          section: (r[0] ?? '').trim(),
          libelle: (r[1] ?? '').trim(),
          type: mapType(r[2] ?? ''),
          obligatoire: isOui(r[3] ?? 'oui'),
        }))
        .filter((r) => r.section && r.libelle);
      if (!parsed.length) {
        notifyError('Aucune ligne valide', { description: 'Colonnes attendues : section, libellé, type, obligatoire.' });
        return;
      }

      // Sections existantes (par intitulé) + ordre courant.
      const idByTitle = new Map<string, string>();
      for (const s of sections) idByTitle.set((s.afb_intituleenfrancais ?? '').trim().toLowerCase(), s.afb_questionnairesectionid);
      let secOrder = sections.length ? Math.max(...sections.map((s) => s.afb_numerodordre ?? 0)) : 0;

      // Crée les sections manquantes (ordre d'apparition).
      const seen = new Set<string>();
      for (const row of parsed) {
        const key = row.section.toLowerCase();
        if (idByTitle.has(key) || seen.has(key)) continue;
        seen.add(key);
        secOrder++;
        const createdSec = await createSection.mutateAsync({
          afb_intituleenfrancais: row.section,
          afb_intituleenanglais: row.section,
          afb_numerodordre: secOrder,
          'afb_questionnaireassocie@odata.bind': `/afb_questionnaires(${questionnaireId})`,
        } as unknown as Parameters<typeof createSection.mutateAsync>[0]);
        idByTitle.set(key, createdSec.afb_questionnairesectionid);
      }

      // Ordre courant des questions par section.
      const qOrder = new Map<string, number>();
      for (const [sid, qs] of questionsBySection) qOrder.set(sid, qs.length ? Math.max(...qs.map((q) => q.afb_numerodordre ?? 0)) : 0);

      let createdCount = 0;
      for (const row of parsed) {
        const sid = idByTitle.get(row.section.toLowerCase());
        if (!sid) continue;
        const ord = (qOrder.get(sid) ?? 0) + 1;
        qOrder.set(sid, ord);
        const q = await createQuestion.mutateAsync({
          afb_codedelaquestion: `Q-${Date.now()}-${createdCount}`,
          afb_libelleenfrancais: row.libelle,
          afb_libelleenanglais: row.libelle,
          afb_numerodordre: ord,
          afb_obligatoire: row.obligatoire ? 0 : 747010001,
          afb_piecejointerequise: row.type === 2 ? 0 : 1,
          afb_typedequestion: row.type,
          'afb_section@odata.bind': `/afb_questionnairesections(${sid})`,
        } as unknown as Parameters<typeof createQuestion.mutateAsync>[0]);
        for (const o of optionsForType(row.type)) {
          await createOption.mutateAsync({
            afb_libelleenfrancais: o.libelle,
            afb_libelleenanglais: o.libelle,
            afb_valeurstockee: o.valeur,
            afb_ordredaffichage: o.ordre,
            'afb_identifiantdelaquestion@odata.bind': `/afb_questions(${q.afb_questionid})`,
          } as unknown as Parameters<typeof createOption.mutateAsync>[0]);
        }
        createdCount++;
      }
      notifySuccess('Import CSV terminé', { description: `${createdCount} question(s) importée(s).` });
    } catch (e) {
      notifyError('Import impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
    } finally {
      setBusy(false);
    }
  };

  const removeQuestion = async (id: string) => {
    setBusy(true);
    try {
      await deleteQuestionM.mutateAsync(id);
      notifySuccess('Question supprimée');
    } catch (e) {
      notifyError('Suppression impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
    } finally {
      setBusy(false);
    }
  };

  const removeSection = async (sec: Afb_questionnairesections) => {
    setBusy(true);
    try {
      // Supprime d'abord les questions de la section pour éviter les orphelines.
      for (const q of questionsBySection.get(sec.afb_questionnairesectionid) ?? []) {
        await deleteQuestionM.mutateAsync(q.afb_questionid);
      }
      await deleteSectionM.mutateAsync(sec.afb_questionnairesectionid);
      notifySuccess('Section supprimée');
    } catch (e) {
      notifyError('Suppression impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
    } finally {
      setBusy(false);
    }
  };

  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barre d'import */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label
          className={undefined}
          style={{
            ...btn,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
            fontSize: 13,
            fontWeight: 600,
            color: '#c8102e',
            border: '1px solid #F3C9CD',
            borderRadius: 6,
            padding: '5px 12px',
            background: '#FFF',
          }}
        >
          <ArrowUpload20Regular /> Importer CSV
          <input
            type="file"
            hidden
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              importCsv(f);
            }}
          />
        </label>
        <Button size="small" appearance="subtle" icon={<ArrowDownload20Regular />} disabled={busy} onClick={downloadTemplate}>
          Modèle CSV
        </Button>
        <span style={{ fontSize: 12, color: '#909090' }}>Colonnes : section, libellé, type, obligatoire</span>
      </div>

      {sections.length === 0 && !secForm && (
        <p style={{ fontSize: 13, color: '#737373', margin: 0 }}>
          Aucune section. Ajoutez une première section pour commencer à construire le questionnaire.
        </p>
      )}

      {sections.map((sec) => {
        const qs = questionsBySection.get(sec.afb_questionnairesectionid) ?? [];
        return (
          <div key={sec.afb_questionnairesectionid} style={{ border: '1px solid #EDEDED', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <strong style={{ flex: 1, fontSize: 14, color: '#1A1A1A' }}>{sec.afb_intituleenfrancais}</strong>
              <Badge appearance="tint" color="subtle" size="small">{qs.length} question{qs.length > 1 ? 's' : ''}</Badge>
              <Tooltip content="Renommer la section" relationship="label">
                <Button size="small" appearance="subtle" icon={<Edit20Regular />} disabled={busy}
                  onClick={() => setSecForm({ id: sec.afb_questionnairesectionid, intitule: sec.afb_intituleenfrancais ?? '' })} />
              </Tooltip>
              <Tooltip content="Supprimer la section" relationship="label">
                <Button size="small" appearance="subtle" icon={<Delete20Regular />} disabled={busy}
                  onClick={() => removeSection(sec)} />
              </Tooltip>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {qs.map((q) => (
                <div key={q.afb_questionid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#FAFAFA', borderRadius: 6 }}>
                  <Badge appearance="outline" size="small">{typeLabel(q.afb_typedequestion as number)}</Badge>
                  <span style={{ flex: 1, fontSize: 13 }}>{q.afb_libelleenfrancais}</span>
                  {q.afb_obligatoire === 0 && <Badge appearance="tint" color="danger" size="small">Requis</Badge>}
                  <Button size="small" appearance="subtle" icon={<Edit20Regular />} disabled={busy}
                    onClick={() => setQForm({ id: q.afb_questionid, sectionId: sec.afb_questionnairesectionid, libelle: q.afb_libelleenfrancais ?? '', type: (q.afb_typedequestion as number) ?? 0, obligatoire: q.afb_obligatoire === 0 })} />
                  <Button size="small" appearance="subtle" icon={<Delete20Regular />} disabled={busy}
                    onClick={() => removeQuestion(q.afb_questionid)} />
                </div>
              ))}
            </div>

            {/* Formulaire question (ajout/édition dans cette section) */}
            {qForm && qForm.sectionId === sec.afb_questionnairesectionid ? (
              <div style={{ marginTop: 10, padding: 12, border: '1px dashed #D0D0D0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input value={qForm.libelle} placeholder="Libellé de la question"
                  onChange={(_, d) => setQForm({ ...qForm, libelle: d.value })} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Dropdown value={typeLabel(qForm.type)} selectedOptions={[String(qForm.type)]} style={{ minWidth: 200 }}
                    onOptionSelect={(_, d) => setQForm({ ...qForm, type: Number(d.optionValue) })}>
                    {Q_TYPES.map((t) => <Option key={t.value} value={String(t.value)}>{t.label}</Option>)}
                  </Dropdown>
                  <Switch checked={qForm.obligatoire} label="Obligatoire"
                    onChange={(_, d) => setQForm({ ...qForm, obligatoire: d.checked })} />
                  <div style={{ flex: 1 }} />
                  <Button size="small" appearance="primary" icon={<Save20Regular />} disabled={busy || !qForm.libelle.trim()} onClick={saveQuestion} style={btn}>Enregistrer</Button>
                  <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} disabled={busy} onClick={() => setQForm(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button size="small" appearance="subtle" icon={<Add20Regular />} disabled={busy} style={{ marginTop: 8 }}
                onClick={() => setQForm({ sectionId: sec.afb_questionnairesectionid, libelle: '', type: 0, obligatoire: true })}>
                Ajouter une question
              </Button>
            )}
          </div>
        );
      })}

      {/* Formulaire section (ajout/édition) */}
      {secForm ? (
        <div style={{ padding: 12, border: '1px dashed #D0D0D0', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input style={{ flex: 1 }} value={secForm.intitule} placeholder="Intitulé de la section"
            onChange={(_, d) => setSecForm({ ...secForm, intitule: d.value })} />
          <Button size="small" appearance="primary" icon={<Save20Regular />} disabled={busy || !secForm.intitule.trim()} onClick={saveSection}>Enregistrer</Button>
          <Button size="small" appearance="subtle" icon={<Dismiss20Regular />} disabled={busy} onClick={() => setSecForm(null)}>Annuler</Button>
        </div>
      ) : (
        <Button appearance="outline" icon={<Add20Regular />} disabled={busy} onClick={() => setSecForm({ intitule: '' })}>
          Ajouter une section
        </Button>
      )}
    </div>
  );
}
