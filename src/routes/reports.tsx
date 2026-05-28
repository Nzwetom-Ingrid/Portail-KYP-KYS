import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({ component: Reports });

function Reports() {
  const reports = [
    { n: "Rapport mensuel COBAC", d: "Avril 2025", p: "PDF · 4.2 MB" },
    { n: "Synthèse risques UBO", d: "T1 2025", p: "PDF · 2.8 MB" },
    { n: "Audit screening sanctions", d: "Avril 2025", p: "PDF · 1.6 MB" },
    { n: "Statistiques onboarding", d: "Avril 2025", p: "PDF · 920 KB" },
  ];
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Rapports PDF" subtitle="Générés automatiquement à partir des données validées" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.n}>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-afb-red/10 text-afb-red flex items-center justify-center">
                <FileText className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">{r.n}</p>
                <p className="text-xs text-muted-foreground">{r.d} · {r.p}</p>
                <div className="mt-3 flex gap-2">
                  <PrimaryButton variant="outline" onClick={() => toast.success(`${r.n} téléchargé`)}><Download className="h-3.5 w-3.5" />Télécharger</PrimaryButton>
                  <PrimaryButton variant="ghost" onClick={() => toast.info(`Aperçu de ${r.n}`)}>Aperçu</PrimaryButton>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
