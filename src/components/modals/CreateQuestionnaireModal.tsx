import { useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import { Plus, Trash2, Send, Paperclip, Users, FileDown, Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { entityTypeLabels, type EntityType } from "@/lib/entity-types";
import {
  questionTypeLabels,
  upsert,
  newId,
  categoriesByTarget,
  targetDirectory,
  cobacAgentBankingTemplate,
  parseCsvQuestions,
  type Question,
  type QuestionType,
  type Questionnaire,
} from "@/lib/questionnaires";
import { useRole } from "@/lib/role-context";
import {
  questionnaires as questionnairesHooks,
  questionnaireSections,
  questions as questionsHooks,
  questionOptions,
  utilisateursInternes,
} from "@/lib/dataverse/entityHooks";

const TYPE_DOC_BY_TARGET: Record<EntityType, number> = {
  correspondant: 2, // KYC
  partenaire: 3, // EXT
  fournisseur: 3, // EXT
  intragroupe: 4, // RISK
};

const QUESTION_TYPE_TO_DV: Record<QuestionType, number> = {
  text: 0, // Textecourt
  long: 747010001, // Textelong
  yesno: 1, // Oui_Non
  choice: 747010002, // Choixunique
  file: 2, // Pi_cejointe
};

function shortCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0")}`;
}

const emptyQ = (): Question => ({
  id: Math.random().toString(36).slice(2, 9),
  label: "",
  type: "text",
  required: true,
  allowFile: false,
});

export function CreateQuestionnaireModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (q: Questionnaire) => void;
}) {
  const { user } = useRole();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<EntityType>("partenaire");
  const [category, setCategory] = useState<string>(categoriesByTarget["partenaire"][0]);
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<Question[]>([emptyQ()]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const createQuestionnaire = questionnairesHooks.useCreate();
  const createSection = questionnaireSections.useCreate();
  const createQuestion = questionsHooks.useCreate();
  const createOption = questionOptions.useCreate();
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  const recipients = targetDirectory[target];

  const updateQ = (i: number, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  const loadCobacTemplate = () => {
    const qs: Question[] = cobacAgentBankingTemplate.map((q) => ({
      ...q, id: Math.random().toString(36).slice(2, 9),
    }));
    setQuestions(qs);
    setTitle((t) => t || "Fiche de contrôle Agent Banking — COBAC");
    if (target === "correspondant") setCategory("Fiche de contrôle COBAC (Agent Banking)");
    toast.success(`${qs.length} questions chargées depuis le modèle COBAC`);
  };

  const onCsvPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsvQuestions(String(reader.result ?? ""));
        if (!parsed.length) return toast.error("Aucune question détectée dans le CSV");
        const qs: Question[] = parsed.map((q) => ({ ...q, id: Math.random().toString(36).slice(2, 9) }));
        setQuestions(qs);
        toast.success(`${qs.length} questions importées depuis le CSV`);
      } catch {
        toast.error("Format CSV invalide", { description: "Colonnes attendues : Section;Question;Type;Référence;Obligatoire;AllowFile" });
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const onTargetChange = (t: EntityType) => {
    setTarget(t);
    setCategory(categoriesByTarget[t][0]);
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Titre du questionnaire requis");
    if (!category) return toast.error("Catégorie requise");
    if (questions.some((q) => !q.label.trim()))
      return toast.error("Chaque question doit avoir un libellé");

    const list = userData ?? [];
    const auteurGuid =
      (user?.email
        ? list.find((u) => (u.afb_adresseemail ?? "").toLowerCase() === user.email.toLowerCase())
        : undefined)?.afb_utilisateurinterneid ?? list[0]?.afb_utilisateurinterneid;
    if (!auteurGuid) {
      return toast.error("Aucun utilisateur interne dans Dataverse", {
        description: "Créez un utilisateur interne d'abord pour endosser l'auteur du questionnaire.",
      });
    }

    setSubmitting(true);
    const dvQuestionIds: Record<string, string> = {};
    let dvQuestionnaireId: string | undefined;
    let dvSectionId: string | undefined;

    try {
      const newQuestionnaire = await createQuestionnaire.mutateAsync({
        afb_codedudocument: shortCode("QST"),
        afb_titreenfrancais: title.trim(),
        afb_titreenanglais: title.trim(),
        afb_typededocument: TYPE_DOC_BY_TARGET[target] ?? 747010002, // LIBRE par défaut
        afb_version: 1,
        afb_statutdepublication: 0, // Publi_
        afb_datedepublication: new Date().toISOString(),
        ...(description.trim() ? { afb_descriptionducontenu: description.trim() } : {}),
        "afb_auteur@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
      } as unknown as Parameters<typeof createQuestionnaire.mutateAsync>[0]);
      dvQuestionnaireId = newQuestionnaire.afb_questionnaireid;

      const sectionLabel = `${entityTypeLabels[target]} — ${category}`;
      const newSection = await createSection.mutateAsync({
        afb_intituleenfrancais: sectionLabel,
        afb_intituleenanglais: sectionLabel,
        afb_numerodordre: 1,
        "afb_questionnaireassocie@odata.bind": `/afb_questionnaires(${dvQuestionnaireId})`,
      } as unknown as Parameters<typeof createSection.mutateAsync>[0]);
      dvSectionId = newSection.afb_questionnairesectionid;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const newQuestion = await createQuestion.mutateAsync({
          afb_codedelaquestion: shortCode("Q"),
          afb_libelleenfrancais: q.label,
          afb_libelleenanglais: q.label,
          afb_numerodordre: i + 1,
          afb_obligatoire: q.required ? 0 : 747010001, // Oui : 0, Non : 747010001
          afb_piecejointerequise: q.type === "file" || q.allowFile ? 0 : 1, // Oui : 0, Non : 1
          afb_typedequestion: QUESTION_TYPE_TO_DV[q.type] ?? 0,
          ...(q.reference ? { afb_referencereglementaire: q.reference } : {}),
          ...(q.section ? { afb_aidealasaisie: q.section } : {}),
          "afb_section@odata.bind": `/afb_questionnairesections(${dvSectionId})`,
        } as unknown as Parameters<typeof createQuestion.mutateAsync>[0]);
        dvQuestionIds[q.id] = newQuestion.afb_questionid;

        if (q.type === "choice" && q.options && q.options.length > 0) {
          for (let j = 0; j < q.options.length; j++) {
            const opt = q.options[j];
            await createOption.mutateAsync({
              afb_libelleenfrancais: opt,
              afb_libelleenanglais: opt,
              afb_ordredaffichage: j + 1,
              afb_valeurstockee: opt,
              "afb_identifiantdelaquestion@odata.bind": `/afb_questions(${newQuestion.afb_questionid})`,
            } as unknown as Parameters<typeof createOption.mutateAsync>[0]);
          }
        }
      }
    } catch (e) {
      setSubmitting(false);
      toast.error("Enregistrement Dataverse partiel", {
        description: e instanceof Error ? e.message : "Erreur Dataverse — le questionnaire local est conservé.",
      });
    }

    const q: Questionnaire = {
      id: newId(),
      title: title.trim(),
      description: description.trim() || undefined,
      target,
      category,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
      createdBy: user?.name ?? "Admin",
      questions,
      status: "envoyé",
      dvQuestionnaireId,
      dvSectionId,
      dvQuestionIds,
    };
    upsert(q);
    toast.success("Questionnaire diffusé", {
      description: dvQuestionnaireId
        ? `« ${category} » · ${recipients.length} ${entityTypeLabels[target].toLowerCase()}(s) · enregistré dans Dataverse.`
        : `« ${category} » · ${recipients.length} destinataire(s) · stocké en local uniquement.`,
    });
    onCreated?.(q);
    setTitle("");
    setDescription("");
    setDueDate("");
    setQuestions([emptyQ()]);
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau questionnaire"
      description="Sélectionnez une cible et une catégorie : le questionnaire sera diffusé à toutes les entités de cette cible."
      size="xl"
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </PrimaryButton>
          <PrimaryButton variant="red" onClick={submit} disabled={submitting}>
            <Send className="h-4 w-4" /> {submitting ? "Diffusion…" : "Diffuser à la cible"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium">Titre</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Mise à jour KYS — exercice 2026"
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium">Instructions (optionnel)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-card text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Cible</span>
            <select
              value={target}
              onChange={(e) => onTargetChange(e.target.value as EntityType)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            >
              {(Object.keys(entityTypeLabels) as EntityType[]).map((k) => (
                <option key={k} value={k}>
                  {entityTypeLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium">Catégorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            >
              {categoriesByTarget[target].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium">Date limite</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            />
          </label>
        </div>

        <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs flex items-start gap-2">
          <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-primary">
              Diffusion automatique à {recipients.length} destinataire(s)
            </p>
            <p className="text-muted-foreground mt-0.5">
              {recipients.map((r) => r.name).join(" · ")}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-sm font-semibold text-primary">Questions ({questions.length})</h4>
            <div className="flex gap-2 flex-wrap">
              <PrimaryButton variant="outline" onClick={loadCobacTemplate}>
                <FileCheck2 className="h-4 w-4" /> Modèle COBAC
              </PrimaryButton>
              <PrimaryButton variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Importer CSV
              </PrimaryButton>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvPick} />
              <a
                href={"data:text/csv;charset=utf-8," + encodeURIComponent("Section;Question;Type;Reference;Obligatoire;AllowFile\nConformité;Le prestataire est-il agréé ?;yesno;COBAC R-2016-04 Art.63;O;O\n")}
                download="modele-questionnaire.csv"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2"
              >
                <FileDown className="h-3.5 w-3.5" /> modèle CSV
              </a>
              <PrimaryButton variant="red" onClick={() => setQuestions((qs) => [...qs, emptyQ()])}>
                <Plus className="h-4 w-4" /> Ajouter
              </PrimaryButton>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mb-3">
            Astuce : utilisez le champ <strong>Section</strong> pour regrouper les longues listes (ex. Conformité, LCB-FT, Comptable).
          </p>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-start gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-1">
                    {i + 1}
                  </span>
                  <input
                    value={q.label}
                    onChange={(e) => updateQ(i, { label: e.target.value })}
                    placeholder="Libellé de la question"
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-sm"
                  />
                  <button
                    onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                    className="h-9 w-9 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 mt-2">
                  <input value={q.section ?? ""} onChange={(e) => updateQ(i, { section: e.target.value })}
                    placeholder="Section (ex. Conformité)" className="h-8 px-2 rounded-md border border-input bg-card text-xs" />
                  <input value={q.reference ?? ""} onChange={(e) => updateQ(i, { reference: e.target.value })}
                    placeholder="Référence (ex. COBAC R-2016-04 Art.65)" className="h-8 px-2 rounded-md border border-input bg-card text-xs" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-8 mt-2">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</span>
                    <select
                      value={q.type}
                      onChange={(e) => updateQ(i, { type: e.target.value as QuestionType })}
                      className="mt-1 w-full h-9 px-2 rounded-md border border-input bg-card text-xs"
                    >
                      {(Object.keys(questionTypeLabels) as QuestionType[]).map((k) => (
                        <option key={k} value={k}>
                          {questionTypeLabels[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs mt-5">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQ(i, { required: e.target.checked })}
                    />
                    Réponse obligatoire
                  </label>
                  {q.type !== "file" && (
                    <label className="flex items-center gap-2 text-xs mt-5">
                      <input
                        type="checkbox"
                        checked={!!q.allowFile}
                        onChange={(e) => updateQ(i, { allowFile: e.target.checked })}
                      />
                      <Paperclip className="h-3 w-3" /> Joindre un document
                    </label>
                  )}
                  {q.type === "choice" && (
                    <label className="block sm:col-span-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Options (séparées par ;)</span>
                      <input
                        value={(q.options ?? []).join("; ")}
                        onChange={(e) =>
                          updateQ(i, {
                            options: e.target.value
                              .split(";")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Option A; Option B; Option C"
                        className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-card text-xs"
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
