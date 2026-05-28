import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader, PrimaryButton, StatusBadge } from "@/components/ui-kit";
import { ClipboardList, Plus, Eye, Users, ChevronDown, ChevronRight, Folder } from "lucide-react";
import { CreateQuestionnaireModal } from "@/components/modals/CreateQuestionnaireModal";
import { QuestionnaireResponsesModal } from "@/components/modals/QuestionnaireResponsesModal";
import { loadAll, targetDirectory, categoriesByTarget, type Questionnaire } from "@/lib/questionnaires";
import { entityTypeLabels, formatDate, type EntityType } from "@/lib/entity-types";

export const Route = createFileRoute("/questionnaires")({ component: QuestionnairesPage });

const TARGETS: EntityType[] = ["correspondant", "partenaire", "fournisseur"];

function QuestionnairesPage() {
  const [list, setList] = useState<Questionnaire[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<Questionnaire | null>(null);
  const [activeTarget, setActiveTarget] = useState<EntityType>("partenaire");
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const refresh = () => setList(loadAll());
    refresh();
    window.addEventListener("afb:questionnaires", refresh);
    return () => window.removeEventListener("afb:questionnaires", refresh);
  }, []);

  const counts = {
    sent: list.filter((q) => q.status === "envoyé").length,
    progress: list.filter((q) => q.status === "en_cours").length,
    done: list.filter((q) => q.status === "complété").length,
  };

  const grouped = useMemo(() => {
    const filtered = list.filter((q) => q.target === activeTarget);
    const by: Record<string, Questionnaire[]> = {};
    for (const cat of categoriesByTarget[activeTarget]) by[cat] = [];
    for (const q of filtered) {
      if (!by[q.category]) by[q.category] = [];
      by[q.category].push(q);
    }
    return by;
  }, [list, activeTarget]);

  const statusBadge = (s: Questionnaire["status"]) =>
    s === "complété" ? "Validé" : s === "en_cours" ? "En revue" : "Brouillon";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Questionnaires aux cibles"
        subtitle="Créez des questionnaires par catégorie et diffusez-les automatiquement à toutes les entités d'une cible."
        actions={
          <PrimaryButton variant="red" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nouveau questionnaire
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { l: "Envoyés", v: counts.sent, c: "text-primary" },
          { l: "En cours", v: counts.progress, c: "text-afb-gold" },
          { l: "Complétés", v: counts.done, c: "text-success" },
        ].map((s) => (
          <Card key={s.l}>
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-3xl font-bold ${s.c} mt-1`}>{s.v}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap border-b border-border">
        {TARGETS.map((t) => {
          const n = list.filter((q) => q.target === t).length;
          const active = activeTarget === t;
          return (
            <button
              key={t}
              onClick={() => setActiveTarget(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
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
        <div className="space-y-3">
          {categoriesByTarget[activeTarget].map((cat) => {
            const items = grouped[cat] ?? [];
            const isOpen = openCat[cat] ?? items.length > 0;
            return (
              <div key={cat} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenCat((s) => ({ ...s, [cat]: !isOpen }))}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold flex-1">{cat}</span>
                  <span className="text-xs text-muted-foreground">{items.length} questionnaire(s)</span>
                </button>

                {isOpen && (
                  <div>
                    {items.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground px-3 py-3">
                        Aucun questionnaire dans cette catégorie.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {items.map((q) => {
                          const total = targetDirectory[q.target].length;
                          const done = q.responseSets?.length ?? 0;
                          return (
                            <li key={q.id} className="py-3 px-3 flex items-center gap-3 sm:gap-4 flex-wrap">
                              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <ClipboardList className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{q.title}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <Users className="h-3 w-3" /> Diffusé à {total} {entityTypeLabels[q.target].toLowerCase()}(s)
                                  <span>·</span>
                                  <span>{done}/{total} ont répondu</span>
                                  <span>·</span>
                                  <span>{q.questions.length} questions</span>
                                  {q.dueDate && (
                                    <>
                                      <span>·</span>
                                      <span>échéance {formatDate(new Date(q.dueDate))}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                              <StatusBadge status={statusBadge(q.status) as any} />
                              <button
                                onClick={() => setView(q)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" /> Voir réponses
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <CreateQuestionnaireModal open={createOpen} onOpenChange={setCreateOpen} />
      <QuestionnaireResponsesModal
        open={!!view}
        onOpenChange={(o) => !o && setView(null)}
        questionnaire={view}
      />
    </div>
  );
}
