import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader, PrimaryButton, StatusBadge } from "@/components/ui-kit";
import { ClipboardList, Calendar, ArrowRight, Folder } from "lucide-react";
import { FillQuestionnaireModal } from "@/components/modals/FillQuestionnaireModal";
import { loadAll, categoriesByTarget, type Questionnaire } from "@/lib/questionnaires";
import { entityTypeLabels, formatDate, type EntityType } from "@/lib/entity-types";

export const Route = createFileRoute("/my-questionnaires")({ component: MyQuestionnaires });

const TARGETS: EntityType[] = ["correspondant", "partenaire", "fournisseur"];

function MyQuestionnaires() {
  const [list, setList] = useState<Questionnaire[]>([]);
  const [active, setActive] = useState<Questionnaire | null>(null);
  const [target, setTarget] = useState<EntityType>("partenaire");

  useEffect(() => {
    const refresh = () => setList(loadAll());
    refresh();
    window.addEventListener("afb:questionnaires", refresh);
    return () => window.removeEventListener("afb:questionnaires", refresh);
  }, []);

  const grouped = useMemo(() => {
    const by: Record<string, Questionnaire[]> = {};
    for (const cat of categoriesByTarget[target]) by[cat] = [];
    for (const q of list.filter((q) => q.target === target)) {
      if (!by[q.category]) by[q.category] = [];
      by[q.category].push(q);
    }
    return by;
  }, [list, target]);

  const statusBadge = (s: Questionnaire["status"]) =>
    s === "complété" ? "Validé" : s === "en_cours" ? "En revue" : "Brouillon";

  const totalForTarget = list.filter((q) => q.target === target).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Mes questionnaires"
        subtitle="Questionnaires reçus d'Afriland First Bank, organisés par catégorie."
      />

      <div className="flex gap-2 flex-wrap border-b border-border">
        {TARGETS.map((t) => {
          const n = list.filter((q) => q.target === t).length;
          const isActive = target === t;
          return (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {entityTypeLabels[t]} <span className="text-xs opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      <Card>
        {totalForTarget === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-primary/40" />
            <p className="text-sm">Aucun questionnaire pour cette cible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoriesByTarget[target].map((cat) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={cat} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold flex-1">{cat}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((q) => (
                      <li
                        key={q.id}
                        className="py-3 px-3 flex items-center gap-3 sm:gap-4 flex-wrap"
                      >
                        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{q.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>Émetteur : Afriland First Bank</span>
                            <span>·</span>
                            <span>{q.questions.length} questions</span>
                            {q.dueDate && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {formatDate(new Date(q.dueDate))}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <StatusBadge status={statusBadge(q.status) as any} />
                        <PrimaryButton variant="red" onClick={() => setActive(q)}>
                          {q.status === "complété" ? "Revoir" : "Répondre"}
                          <ArrowRight className="h-4 w-4" />
                        </PrimaryButton>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <FillQuestionnaireModal
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        questionnaire={active}
      />
    </div>
  );
}
