import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/validations")({ component: Validations });

type Pending = {
  id: string; action: string; target: string; initiator: string; direction: string; date: string;
  before?: string; after?: string;
};

const initial: Pending[] = [
  { id: "VAL-2026-0042", action: "Modification fiche tiers", target: "SOCAPALM SA", initiator: "M. Eboa", direction: "DMG", date: "07/05/2026 14:21", before: "Risque: Low", after: "Risque: Medium" },
  { id: "VAL-2026-0043", action: "Rejet de dossier", target: "AgroNord SARL", initiator: "M. Eboa", direction: "DMG", date: "07/05/2026 15:02" },
  { id: "VAL-2026-0044", action: "Demande de complément", target: "Logistics Cameroon Ltd", initiator: "A. Tchami", direction: "TRESO", date: "08/05/2026 09:11" },
  { id: "VAL-2026-0045", action: "Création nouveau tiers", target: "Atlas Energy SA", initiator: "F. Onana", direction: "COMEX", date: "08/05/2026 10:34" },
];

function Validations() {
  const [items, setItems] = useState(initial);
  const [decision, setDecision] = useState<{ p: Pending; type: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");

  const handle = () => {
    if (!decision) return;
    if (comment.trim().length < 5) return toast.error("Commentaire obligatoire");
    setItems((s) => s.filter((x) => x.id !== decision.p.id));
    toast.success(`${decision.type === "approve" ? "Action approuvée" : "Action refusée"} — ${decision.p.target}`, {
      description: `Notification envoyée à ${decision.p.initiator}`,
    });
    setDecision(null);
    setComment("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Validations DCONF"
        subtitle="Double validation des actions des directions métier — cloisonnement RBAC Dataverse"
      />

      <Card className="border-l-4 border-l-afb-red">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-afb-red shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">{items.length} actions en attente de validation DCONF</p>
            <p className="text-sm text-muted-foreground">Aucune modification n'est appliquée au référentiel tant qu'elle n'est pas validée.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Tiers</th>
                <th className="text-left px-4 py-3 font-medium">Initiateur</th>
                <th className="text-left px-4 py-3 font-medium">Direction</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Décision</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{p.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.action}</p>
                    {p.before && <p className="text-[10px] text-muted-foreground">{p.before} → {p.after}</p>}
                  </td>
                  <td className="px-4 py-3">{p.target}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.initiator}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{p.direction}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDecision({ p, type: "reject" })} className="h-8 w-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center">
                        <XCircle className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDecision({ p, type: "approve" })} className="h-8 w-8 rounded-md hover:bg-success/10 text-success flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune action en attente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!decision} onOpenChange={(o) => !o && (setDecision(null), setComment(""))}
        title={decision?.type === "approve" ? "Approuver l'action" : "Refuser l'action"}
        description={decision ? `${decision.p.action} · ${decision.p.target}` : ""}
        footer={
          <>
            <PrimaryButton variant="outline" onClick={() => { setDecision(null); setComment(""); }}>Annuler</PrimaryButton>
            <PrimaryButton variant={decision?.type === "approve" ? "primary" : "red"} onClick={handle}>
              {decision?.type === "approve" ? "Approuver" : "Refuser"}
            </PrimaryButton>
          </>
        }
      >
        <label className="block">
          <span className="text-xs font-medium">Commentaire DCONF (obligatoire)</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            placeholder="Justifiez la décision pour traçabilité COBAC…"
            className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-card text-sm" />
        </label>
      </Modal>
    </div>
  );
}
