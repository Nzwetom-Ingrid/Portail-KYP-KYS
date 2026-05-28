import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton, StatusBadge } from "@/components/ui-kit";
import { questionTypeLabels, targetDirectory, type Questionnaire } from "@/lib/questionnaires";
import { entityTypeLabels, formatDate } from "@/lib/entity-types";
import { FileText, Mail, Calendar, Users, ChevronDown, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export function QuestionnaireResponsesModal({
  open,
  onOpenChange,
  questionnaire,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  questionnaire: Questionnaire | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!questionnaire) return null;

  const directory = targetDirectory[questionnaire.target];
  const responseSets = questionnaire.responseSets ?? [];
  const respondedEmails = new Set(responseSets.map((r) => r.respondentEmail));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={questionnaire.title}
      description={`Catégorie « ${questionnaire.category} » · ${entityTypeLabels[questionnaire.target]}`}
      size="xl"
      footer={
        <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>
          Fermer
        </PrimaryButton>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-muted/30 rounded-md p-3">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {directory.length} destinataire(s)
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            {responseSets.length} réponse(s)
          </div>
          {questionnaire.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Échéance : {formatDate(new Date(questionnaire.dueDate))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-primary mb-2">Suivi par destinataire</h4>
          <ul className="space-y-2">
            {directory.map((d) => {
              const rs = responseSets.find((r) => r.respondentEmail === d.email);
              const isOpen = expanded === d.email;
              return (
                <li key={d.email} className="border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : d.email)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/40 text-left"
                  >
                    {rs ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {d.email}
                      </p>
                    </div>
                    {rs ? (
                      <StatusBadge status="Validé" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                  </button>

                  {isOpen && rs && (
                    <div className="border-t border-border bg-muted/10 p-3 space-y-3">
                      <p className="text-[11px] text-muted-foreground">
                        Soumis le {formatDate(new Date(rs.submittedAt))}
                      </p>
                      <ol className="space-y-2">
                        {questionnaire.questions.map((q, i) => {
                          const a = rs.answers.find((x) => x.questionId === q.id);
                          return (
                            <li key={q.id} className="border border-border rounded-md p-2 bg-card">
                              <div className="flex items-start gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium">{q.label}</p>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {questionTypeLabels[q.type]}
                                  </p>
                                  {a?.value && (
                                    <p className="text-sm bg-success/5 border-l-2 border-success pl-2 py-1 mt-1 whitespace-pre-wrap">
                                      {a.value}
                                    </p>
                                  )}
                                  {a?.fileName && (
                                    <div className="mt-1.5 flex items-center gap-2 text-xs bg-muted/40 rounded-md p-1.5">
                                      <FileText className="h-3.5 w-3.5 text-primary" />
                                      <span className="font-medium truncate flex-1">
                                        {a.fileName}
                                      </span>
                                      {a.fileSize && (
                                        <span className="text-muted-foreground">
                                          {(a.fileSize / 1024).toFixed(1)} KB
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {!a && (
                                    <p className="text-[11px] italic text-muted-foreground mt-1">
                                      Sans réponse
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {respondedEmails.size === 0 && (
            <p className="text-xs italic text-muted-foreground text-center mt-3">
              Aucune réponse reçue pour le moment.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
