import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, RiskBadge, PrimaryButton } from "@/components/ui-kit";
import { ShieldAlert, Search, AlertTriangle } from "lucide-react";
import { ScreeningModal } from "@/components/modals/ScreeningModal";
import { HitReviewModal } from "@/components/modals/HitReviewModal";

export const Route = createFileRoute("/screening")({ component: Screening });

const hits = [
  { name: "Robert Tchoungui", source: "OFAC SDN List", match: 94, level: "high" as const, type: "Sanction" },
  { name: "Aminata Diallo", source: "PEP Database", match: 88, level: "medium" as const, type: "PPE" },
  { name: "Ibrahim Sani", source: "EU Sanctions", match: 62, level: "medium" as const, type: "Adverse Media" },
];

function Screening() {
  const [scanOpen, setScanOpen] = useState(false);
  const [hit, setHit] = useState<typeof hits[number] | null>(null);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Screening PPE & Sanctions"
        subtitle="Vérification automatique contre listes OFAC, EU, UN et bases PPE"
        actions={
          <PrimaryButton variant="red" onClick={() => setScanOpen(true)}>
            <Search className="h-4 w-4" />Lancer un screening
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Screenings effectués</p>
          <p className="text-3xl font-bold text-primary mt-2">2 471</p>
          <p className="text-xs text-success mt-1">Ce mois</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Correspondances actives</p>
          <p className="text-3xl font-bold text-afb-red mt-2">8</p>
          <p className="text-xs text-muted-foreground mt-1">À traiter sous 48h</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Faux positifs résolus</p>
          <p className="text-3xl font-bold text-primary mt-2">142</p>
          <p className="text-xs text-muted-foreground mt-1">Ce trimestre</p>
        </Card>
      </div>

      <Card className="border-l-4 border-l-afb-red">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-afb-red shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">3 alertes critiques requièrent une action immédiate</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Correspondances supérieures à 85% détectées sur les listes de sanctions internationales.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Correspondances détectées
        </h3>
        <div className="space-y-3">
          {hits.map((h) => (
            <div key={h.name} className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-afb-red/10 text-afb-red flex items-center justify-center font-semibold text-sm">
                    {h.name.split(" ").map((p) => p[0]).join("")}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.source} · {h.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Score de correspondance</p>
                    <p className="font-bold text-primary">{h.match}%</p>
                  </div>
                  <RiskBadge level={h.level} />
                  <PrimaryButton variant="outline" onClick={() => setHit(h)}>Examiner</PrimaryButton>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${h.match > 85 ? "bg-afb-red" : "bg-afb-gold"}`}
                  style={{ width: `${h.match}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ScreeningModal open={scanOpen} onOpenChange={setScanOpen} />
      <HitReviewModal hit={hit} open={!!hit} onOpenChange={(o) => !o && setHit(null)} />
    </div>
  );
}
