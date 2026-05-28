import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/evaluations")({ component: Evaluations });

const criteria = [
  "Respect des délais",
  "Qualité des livrables",
  "Conformité documentaire",
  "Réactivité commerciale",
  "Respect des engagements contractuels",
];

const levels = ["Satisfaisant", "Moyen", "Insuffisant"] as const;
type Level = typeof levels[number];

const score: Record<Level, number> = { Satisfaisant: 3, Moyen: 2, Insuffisant: 1 };

function Evaluations() {
  const [tier, setTier] = useState("SOCAPALM SA");
  const [grades, setGrades] = useState<Record<string, Level>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const set = (c: string, l: Level) => setGrades({ ...grades, [c]: l });
  const setC = (c: string, v: string) => setComments({ ...comments, [c]: v });

  const filled = criteria.filter((c) => grades[c]);
  const avg = filled.length ? filled.reduce((s, c) => s + score[grades[c]], 0) / filled.length : 0;
  const global: Level | "—" = avg === 0 ? "—" : avg >= 2.5 ? "Satisfaisant" : avg >= 1.5 ? "Moyen" : "Insuffisant";
  const globalColor = global === "Satisfaisant" ? "text-success" : global === "Moyen" ? "text-afb-gold" : global === "Insuffisant" ? "text-afb-red" : "text-muted-foreground";

  const submit = () => {
    if (filled.length < criteria.length) return toast.error("Notez tous les critères");
    if (criteria.some((c) => !comments[c]?.trim())) return toast.error("Commentaire obligatoire pour chaque critère");
    toast.success(`Évaluation enregistrée — note globale : ${global}`);
    if (global === "Insuffisant") {
      setTimeout(() => toast.error("Alerte envoyée au Super Admin DCONF", {
        description: "Décision attendue : Continuer ou Résilier le contrat.",
      }), 600);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Évaluation prestataire"
        subtitle="Échelle à 3 niveaux — déclenchement automatique d'alerte DCONF si Insuffisant"
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <label className="block">
            <span className="text-xs font-medium">Prestataire évalué</span>
            <select value={tier} onChange={(e) => setTier(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm">
              <option>SOCAPALM SA</option>
              <option>Logistics Cameroon Ltd</option>
              <option>Global Trade Cameroun</option>
              <option>Cameroon Telecom Group</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="border border-border rounded-md p-3 w-full">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Note globale</p>
              <p className={`text-xl font-bold mt-1 ${globalColor}`}>{global}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-afb-gold" />{c}
                </p>
                <div className="flex gap-1">
                  {levels.map((l) => (
                    <button key={l} onClick={() => set(c, l)}
                      className={`px-2.5 py-1 text-xs rounded-md border ${grades[c] === l
                        ? l === "Satisfaisant" ? "bg-success text-white border-success"
                          : l === "Moyen" ? "bg-afb-gold text-white border-afb-gold"
                          : "bg-afb-red text-white border-afb-red"
                        : "border-border hover:bg-accent"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={comments[c] ?? ""} onChange={(e) => setC(c, e.target.value)} rows={2}
                placeholder="Commentaire (obligatoire)…"
                className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-card text-sm" />
            </div>
          ))}
        </div>

        {global === "Insuffisant" && (
          <div className="mt-4 p-3 rounded-lg bg-afb-red/10 border border-afb-red/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-afb-red mt-0.5" />
            <p className="text-xs text-afb-red">
              Une note globale Insuffisant déclenchera une alerte automatique au Super Admin DCONF
              pour décision (Continuer / Résilier) avec notification e-mail au prestataire.
            </p>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <PrimaryButton variant="red" onClick={submit}>Enregistrer l'évaluation</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
