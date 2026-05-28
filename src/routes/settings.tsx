import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <PageHeader title="Configuration du portail" subtitle="Seuils de risque, formulaires et intégrations" />

      <Card>
        <h3 className="font-semibold text-primary mb-4">Seuils de risque (scoring)</h3>
        <div className="space-y-4">
          {[
            { l: "Seuil Low → Medium", v: 35, c: "bg-success" },
            { l: "Seuil Medium → High", v: 70, c: "bg-afb-red" },
          ].map((s) => (
            <div key={s.l}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{s.l}</span>
                <span className="font-mono text-primary">{s.v} / 100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${s.c}`} style={{ width: `${s.v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-primary mb-4">Intégrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { n: "Microsoft Power Pages", d: "Portail externe partenaires", on: true },
            { n: "Microsoft Power Apps", d: "Application interne conformité", on: true },
            { n: "Dataverse", d: "Référentiel UBO centralisé", on: true },
            { n: "Coffre-fort numérique", d: "Stockage chiffré AES-256", on: true },
            { n: "Listes OFAC / EU / UN", d: "Mise à jour quotidienne", on: true },
            { n: "Signature électronique", d: "DocuSign / Adobe Sign", on: false },
          ].map((i) => (
            <div key={i.n} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">{i.n}</p>
                <p className="text-xs text-muted-foreground">{i.d}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${i.on ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {i.on ? "Actif" : "Inactif"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <PrimaryButton variant="red" onClick={() => toast.success("Configuration enregistrée")}>Enregistrer</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
