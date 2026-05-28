import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import { addResponseSet, targetDirectory, type Answer, type Questionnaire } from "@/lib/questionnaires";
import { entityTypeLabels, formatDate } from "@/lib/entity-types";
import { Paperclip, Send, UploadCloud, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  questionnaireAssignments,
  questionnaireResponses,
  questionResponses,
  tiers as tiersHooks,
  utilisateursInternes,
} from "@/lib/dataverse/entityHooks";

function shortRef(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0")}`;
}

export function FillQuestionnaireModal({
  open,
  onOpenChange,
  questionnaire,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  questionnaire: Questionnaire | null;
}) {
  const directory = useMemo(
    () => (questionnaire ? targetDirectory[questionnaire.target] : []),
    [questionnaire],
  );
  const [respondentEmail, setRespondentEmail] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);

  const createAssignment = questionnaireAssignments.useCreate();
  const createResponseSet = questionnaireResponses.useCreate();
  const createAnswer = questionResponses.useCreate();
  const { data: tiersData } = tiersHooks.useList({ top: 500 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  useEffect(() => {
    if (questionnaire) {
      const first = directory[0]?.email ?? "";
      setRespondentEmail(first);
      const existing = questionnaire.responseSets?.find((r) => r.respondentEmail === first);
      const init: Record<string, Answer> = {};
      (existing?.answers ?? []).forEach((a) => (init[a.questionId] = a));
      setAnswers(init);
    }
  }, [questionnaire, directory]);

  if (!questionnaire) return null;

  const onPickRespondent = (email: string) => {
    setRespondentEmail(email);
    const existing = questionnaire.responseSets?.find((r) => r.respondentEmail === email);
    const init: Record<string, Answer> = {};
    (existing?.answers ?? []).forEach((a) => (init[a.questionId] = a));
    setAnswers(init);
  };

  const update = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => {
      const prev = a[qid] ?? { questionId: qid, value: "" };
      return { ...a, [qid]: { ...prev, ...patch } };
    });

  const submit = async () => {
    for (const q of questionnaire.questions) {
      if (q.required) {
        const r = answers[q.id];
        const hasValue = r?.value?.trim() || r?.fileName;
        if (!hasValue) return toast.error(`Réponse requise : « ${q.label} »`);
      }
    }
    const respondent = directory.find((d) => d.email === respondentEmail);
    if (!respondent) return toast.error("Sélectionnez un répondant");

    setSubmitting(true);
    let dvWritten = false;
    const dvQId = questionnaire.dvQuestionnaireId;
    const qIdMap = questionnaire.dvQuestionIds ?? {};

    if (dvQId) {
      const needle = respondent.name.toLowerCase();
      const tiersForRespondent =
        (tiersData ?? []).find(
          (t) => (t.afb_nomdupartenaire ?? "").toLowerCase() === needle,
        ) ?? tiersData?.[0];
      const userList = userData ?? [];
      const auteurGuid = userList[0]?.afb_utilisateurinterneid;

      if (tiersForRespondent && auteurGuid) {
        try {
          const newAssignment = await createAssignment.mutateAsync({
            afb_referenceaffectation: shortRef("ASS"),
            afb_datedaffectation: new Date().toISOString(),
            afb_datedecheance: questionnaire.dueDate
              ? new Date(questionnaire.dueDate).toISOString()
              : new Date(Date.now() + 30 * 86_400_000).toISOString(),
            afb_statut: 747010001, // Soumis
            afb_tauxdecompletion: 100,
            afb_typederappels: 0, // Standard
            "afb_auteurdelaffectation@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
            "afb_tiers@odata.bind": `/afb_tierses(${tiersForRespondent.afb_tiersid})`,
            "afb_versionduquestionnaire@odata.bind": `/afb_questionnaires(${dvQId})`,
          } as unknown as Parameters<typeof createAssignment.mutateAsync>[0]);

          const newResponse = await createResponseSet.mutateAsync({
            afb_referencedelareponse: shortRef("RS"),
            afb_datedesoumission: new Date().toISOString(),
            afb_statutglobal: 747010001, // Soumis
            "afb_assignation@odata.bind": `/afb_questionnaireassignments(${newAssignment.afb_questionnaireassignmentid})`,
          } as unknown as Parameters<typeof createResponseSet.mutateAsync>[0]);

          for (const ans of Object.values(answers)) {
            const dvQGuid = qIdMap[ans.questionId];
            if (!dvQGuid) continue;
            const question = questionnaire.questions.find((q) => q.id === ans.questionId);
            const payload: Record<string, unknown> = {
              afb_reference: shortRef("ANS"),
              afb_horodatage: new Date().toISOString(),
              afb_statut: 0, // Valid_e
              "afb_question@odata.bind": `/afb_questions(${dvQGuid})`,
              "afb_reponseauquestionnaire@odata.bind": `/afb_questionnaireresponses(${newResponse.afb_questionnaireresponseid})`,
            };
            if (question?.type === "choice") {
              payload.afb_valeurchoixunique = ans.value ?? "";
            } else {
              payload.afb_descriptiondelalicence = [ans.value, ans.fileName]
                .filter(Boolean)
                .join(" · ");
            }
            await createAnswer.mutateAsync(
              payload as unknown as Parameters<typeof createAnswer.mutateAsync>[0],
            );
          }
          dvWritten = true;
        } catch (e) {
          toast.error("Soumission Dataverse partielle", {
            description: e instanceof Error ? e.message : "Erreur Dataverse — réponses conservées en local.",
          });
        }
      }
    }

    addResponseSet(questionnaire.id, {
      id: "RS-" + Math.random().toString(36).slice(2, 8),
      respondentName: respondent.name,
      respondentEmail: respondent.email,
      submittedAt: new Date().toISOString(),
      answers: Object.values(answers),
    });

    toast.success("Réponses transmises à Afriland First Bank", {
      description: dvWritten
        ? `Soumis par ${respondent.name} · enregistré dans Dataverse.`
        : `Soumis par ${respondent.name} · stocké en local${dvQId ? " (questionnaire Dataverse non lié à un tiers connu)" : " (questionnaire sans GUID Dataverse)"}.`,
    });
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={questionnaire.title}
      description={
        questionnaire.description ??
        `Catégorie « ${questionnaire.category} » · ${entityTypeLabels[questionnaire.target]}`
      }
      size="xl"
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>
            Plus tard
          </PrimaryButton>
          <PrimaryButton variant="red" onClick={submit} disabled={submitting}>
            <Send className="h-4 w-4" /> {submitting ? "Envoi…" : "Soumettre"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md bg-muted/30 p-3 space-y-2">
          <label className="block text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Je réponds en tant que
            </span>
            <select
              value={respondentEmail}
              onChange={(e) => onPickRespondent(e.target.value)}
              className="mt-1 w-full h-9 px-2 rounded-md border border-input bg-card text-sm"
            >
              {directory.map((d) => (
                <option key={d.email} value={d.email}>
                  {d.name} — {d.email}
                </option>
              ))}
            </select>
          </label>
          {questionnaire.dueDate && (
            <div className="text-xs bg-afb-gold/15 text-[oklch(0.4_0.1_75)] px-3 py-1.5 rounded-md inline-block">
              Échéance : {formatDate(new Date(questionnaire.dueDate))}
            </div>
          )}
        </div>

        <ol className="space-y-4">
          {questionnaire.questions.map((q, i) => {
            const r = answers[q.id];
            return (
              <li key={q.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start gap-2 mb-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium flex-1">
                    {q.label}
                    {q.required && <span className="text-afb-red ml-1">*</span>}
                  </p>
                </div>

                <div className="pl-8 space-y-2">
                  {q.type === "text" && (
                    <input
                      value={r?.value ?? ""}
                      onChange={(e) => update(q.id, { value: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
                    />
                  )}
                  {q.type === "long" && (
                    <textarea
                      rows={3}
                      value={r?.value ?? ""}
                      onChange={(e) => update(q.id, { value: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-card text-sm"
                    />
                  )}
                  {q.type === "yesno" && (
                    <div className="flex gap-2">
                      {["Oui", "Non"].map((v) => (
                        <button
                          key={v}
                          onClick={() => update(q.id, { value: v })}
                          className={`px-4 h-9 rounded-md border text-sm ${
                            r?.value === v
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:bg-accent"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.type === "choice" && (
                    <select
                      value={r?.value ?? ""}
                      onChange={(e) => update(q.id, { value: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      {(q.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}

                  {(q.type === "file" || q.allowFile) && (
                    <label className="flex items-center gap-2 text-xs border-2 border-dashed border-border hover:border-primary/40 rounded-md p-3 cursor-pointer">
                      {r?.fileName ? (
                        <>
                          <Paperclip className="h-4 w-4 text-primary" />
                          <span className="font-medium truncate flex-1">{r.fileName}</span>
                          <span className="text-muted-foreground">
                            {((r.fileSize ?? 0) / 1024).toFixed(1)} KB
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 text-primary" />
                          <span>Joindre un document (PDF/JPG/PNG · 10 Mo max)</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) update(q.id, { fileName: f.name, fileSize: f.size });
                        }}
                      />
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Modal>
  );
}
