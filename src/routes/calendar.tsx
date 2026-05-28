import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

type Expiry = { date: string; tier: string; doc: string; owner: string; type: "correspondant" | "partenaire" | "fournisseur"; risk: "low" | "medium" | "high" };

const expiries: Expiry[] = [
  { date: "2026-05-15", tier: "Citibank N.A.", doc: "Wolfsberg CBDDQ", owner: "J. Mbarga", type: "correspondant", risk: "low" },
  { date: "2026-05-22", tier: "SOCAPALM SA", doc: "RCCM", owner: "M. Eboa", type: "partenaire", risk: "low" },
  { date: "2026-06-04", tier: "Global Trade Cameroun", doc: "Attestation CNPS", owner: "S. Nkoa", type: "fournisseur", risk: "medium" },
  { date: "2026-06-12", tier: "BNP Paribas SA", doc: "FATCA W-8BEN-E", owner: "J. Mbarga", type: "correspondant", risk: "medium" },
  { date: "2026-07-01", tier: "PetroAfrica Holdings", doc: "Convention", owner: "M. Eboa", type: "partenaire", risk: "high" },
  { date: "2026-04-30", tier: "Sahel Imports SARL", doc: "Dossier complet", owner: "S. Nkoa", type: "fournisseur", risk: "medium" },
];

function CalendarPage() {
  const [cursor, setCursor] = useState(new Date(2026, 4, 1));
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const list = expiries.filter(
    (e) =>
      (filterType === "all" || e.type === filterType) &&
      (filterRisk === "all" || e.risk === filterRisk),
  );

  const colorFor = (iso: string) => {
    const d = new Date(iso);
    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (days < 0) return "bg-muted text-muted-foreground";
    if (days < 30) return "bg-afb-red/15 text-afb-red";
    if (days < 60) return "bg-afb-gold/30 text-[oklch(0.4_0.1_75)]";
    return "bg-success/15 text-success";
  };

  const cells: (number | null)[] = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const dayItems = (d: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return list.filter((e) => e.date === iso);
  };

  const selectedItems = selected ? list.filter((e) => e.date === selected) : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Calendrier des expirations"
        subtitle="Vue mensuelle des dossiers et pièces arrivant à échéance — cloisonnée par direction"
      />

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="h-9 w-9 rounded-md border border-border hover:bg-accent flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-primary capitalize min-w-[180px] text-center">{monthLabel}</h2>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="h-9 w-9 rounded-md border border-border hover:bg-accent flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 px-2 rounded-md border border-input bg-card text-sm">
              <option value="all">Tous types</option>
              <option value="correspondant">Correspondant bancaire</option>
              <option value="partenaire">Partenaire</option>
              <option value="fournisseur">Fournisseur</option>
            </select>
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="h-9 px-2 rounded-md border border-input bg-card text-sm">
              <option value="all">Tous risques</option>
              <option value="low">Faible</option>
              <option value="medium">Moyen</option>
              <option value="high">Élevé</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 text-xs mb-3 flex-wrap">
          <Legend className="bg-success/15 text-success" l="> 60 jours" />
          <Legend className="bg-afb-gold/30 text-[oklch(0.4_0.1_75)]" l="30–60 jours" />
          <Legend className="bg-afb-red/15 text-afb-red" l="< 30 jours" />
          <Legend className="bg-muted text-muted-foreground" l="Expiré" />
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((d) => (<div key={d} className="px-1 py-1">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-16 sm:min-h-20" />;
            const items = dayItems(d);
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            return (
              <button key={i} onClick={() => items.length && setSelected(iso)}
                className={`min-h-16 sm:min-h-20 border border-border rounded-md p-1.5 text-left hover:border-primary/50 transition-colors ${items.length ? "cursor-pointer" : ""}`}>
                <p className="text-xs font-medium">{d}</p>
                <div className="space-y-0.5 mt-1">
                  {items.slice(0, 2).map((e, idx) => (
                    <span key={idx} className={`block text-[9px] truncate px-1 py-0.5 rounded ${colorFor(e.date)}`}>{e.tier}</span>
                  ))}
                  {items.length > 2 && <span className="text-[9px] text-muted-foreground">+{items.length - 2}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary">Échéances du {new Date(selected).toLocaleDateString("fr-FR")}</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
          </div>
          <div className="space-y-2">
            {selectedItems.map((e, i) => (
              <div key={i} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{e.tier}</p>
                  <p className="text-xs text-muted-foreground">{e.doc} · {e.owner}</p>
                </div>
                <PrimaryButton variant="red" onClick={() => toast.success(`Relance envoyée à ${e.tier}`)}>
                  <Send className="h-3.5 w-3.5" /> Envoyer relance
                </PrimaryButton>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Legend({ className, l }: { className: string; l: string }) {
  return <span className={`px-2 py-0.5 rounded ${className}`}>{l}</span>;
}
