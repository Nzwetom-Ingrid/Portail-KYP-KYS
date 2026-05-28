import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, RiskBadge, StatusBadge, PrimaryButton } from "@/components/ui-kit";
import { Filter, Plus, Search, Banknote, Handshake, Truck, Layers, Building2 } from "lucide-react";
import { NewDossierModal } from "@/components/modals/NewDossierModal";
import { DossierDetailModal } from "@/components/modals/DossierDetailModal";
import { Modal } from "@/components/Modal";
import {
  entityTypeLabels, entityTypeValidityMonths, compositeOf,
  type EntityType, type CompositeRisk, type RiskLevel,
} from "@/lib/entity-types";
import { toast } from "sonner";

export const Route = createFileRoute("/dossiers")({ component: Dossiers });

type Row = {
  id: string; n: string; t: string; type: EntityType;
  risk: CompositeRisk;
  s: "Validé" | "En revue" | "Rejeté" | "Brouillon" | "Expiré";
  owner: string; date: string; validity: string; email: string;
};

const r = (kycAml: RiskLevel, ethique: RiskLevel = "low", fiscal: RiskLevel = "low"): CompositeRisk =>
  ({ kycAml, ethique, fiscal });

const rows: Row[] = [
  { id: "KYC-B-2025-0007", n: "Citibank N.A.", t: "Correspondant bancaire", type: "correspondant", risk: r("low"), s: "Validé", owner: "J. Mbarga", date: "10/04/2025", validity: "10/04/2026", email: "compliance@citi.com" },
  { id: "KYC-B-2025-0011", n: "BNP Paribas SA", t: "Correspondant bancaire", type: "correspondant", risk: r("medium"), s: "En revue", owner: "J. Mbarga", date: "21/04/2025", validity: "21/04/2026", email: "kyc@bnpparibas.com" },
  { id: "KYP-2025-0142", n: "SOCAPALM SA", t: "Partenaire", type: "partenaire", risk: r("low"), s: "Validé", owner: "M. Eboa", date: "12/04/2025", validity: "12/04/2027", email: "direction@socapalm.cm" },
  { id: "KYP-2025-0145", n: "PetroAfrica Holdings", t: "Partenaire", type: "partenaire", risk: r("high", "medium", "low"), s: "En revue", owner: "M. Eboa", date: "20/04/2025", validity: "20/04/2027", email: "ceo@petroafrica.com" },
  { id: "KYP-2025-0149", n: "Cameroon Telecom Group", t: "Partenaire", type: "partenaire", risk: r("low"), s: "Validé", owner: "J. Mbarga", date: "25/04/2025", validity: "25/04/2027", email: "legal@camtel.cm" },
  { id: "KYS-2025-0233", n: "Global Trade Cameroun", t: "Fournisseur", type: "fournisseur", risk: r("medium"), s: "En revue", owner: "S. Nkoa", date: "18/04/2025", validity: "18/04/2028", email: "info@globaltrade.cm" },
  { id: "KYS-2025-0240", n: "Logistics Cameroon Ltd", t: "Fournisseur", type: "fournisseur", risk: r("low"), s: "Brouillon", owner: "A. Tchami", date: "22/04/2025", validity: "22/04/2028", email: "ops@logistics.cm" },
  { id: "KYS-2025-0188", n: "Sahel Imports SARL", t: "Fournisseur", type: "fournisseur", risk: r("medium"), s: "Expiré", owner: "S. Nkoa", date: "01/03/2025", validity: "01/03/2025", email: "contact@sahel.cm" },
  { id: "KYS-2025-0251", n: "AgroNord SARL", t: "Fournisseur", type: "fournisseur", risk: r("high"), s: "Rejeté", owner: "M. Eboa", date: "28/04/2025", validity: "—", email: "info@agronord.cm" },
  // Entités intragroupe — éthique & fiscal élevés par défaut
  { id: "KYI-2025-0001", n: "AFB Holding SA", t: "Entité intragroupe", type: "intragroupe", risk: r("low", "high", "high"), s: "Validé", owner: "J. Mbarga", date: "05/04/2025", validity: "05/04/2026", email: "secretariat@afb-holding.cm" },
  { id: "KYI-2025-0002", n: "AFB Assurance SA", t: "Entité intragroupe", type: "intragroupe", risk: r("low", "high", "high"), s: "En revue", owner: "M. Eboa", date: "15/04/2025", validity: "15/04/2026", email: "compliance@afb-assurance.cm" },
  { id: "KYI-2025-0003", n: "AFB Leasing SARL", t: "Entité intragroupe", type: "intragroupe", risk: r("medium", "high", "high"), s: "En revue", owner: "J. Mbarga", date: "18/04/2025", validity: "18/04/2026", email: "direction@afb-leasing.cm" },
];

const targetTabs: { key: "all" | EntityType; label: string; icon: any }[] = [
  { key: "all", label: "Tous", icon: Layers },
  { key: "correspondant", label: "Correspondants bancaires", icon: Banknote },
  { key: "partenaire", label: "Partenaires", icon: Handshake },
  { key: "fournisseur", label: "Fournisseurs", icon: Truck },
  { key: "intragroupe", label: "Entités intragroupe", icon: Building2 },
];

function Dossiers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [target, setTarget] = useState<"all" | EntityType>("all");
  const [statusTab, setStatusTab] = useState("Tous");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return rows.filter(
      (row) =>
        (target === "all" || row.type === target) &&
        (statusTab === "Tous" || row.s === statusTab) &&
        (needle === "" || row.n.toLowerCase().includes(needle) || row.id.toLowerCase().includes(needle)),
    );
  }, [target, statusTab, q]);

  const counts = useMemo<Record<"all" | EntityType, number>>(() => {
    const c = { all: rows.length, correspondant: 0, partenaire: 0, fournisseur: 0, intragroupe: 0 };
    for (const r of rows) c[r.type]++;
    return c;
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Validation des dossiers"
        subtitle="Pipeline de revue conformité — par type de cible · note composite KYC/AML + Éthique + Fiscal"
        actions={
          <>
            <PrimaryButton variant="outline" onClick={() => setFilterOpen(true)}>
              <Filter className="h-4 w-4" />Filtres
            </PrimaryButton>
            <PrimaryButton variant="red" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />Nouveau dossier
            </PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {targetTabs.map((t) => {
          const Icon = t.icon;
          const active = target === t.key;
          const count = counts[t.key];
          return (
            <button key={t.key} onClick={() => setTarget(t.key)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${active ? "border-afb-red bg-afb-red/5" : "border-border hover:border-primary/40 bg-card"}`}>
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${active ? "text-afb-red" : "text-primary"}`} />
                <span className="text-lg font-bold text-primary">{count}</span>
              </div>
              <p className="text-xs font-semibold text-primary mt-2">{t.label}</p>
              {t.key !== "all" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Validité {entityTypeValidityMonths[t.key as EntityType]} mois
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="flex gap-2 text-xs flex-wrap">
            {["Tous", "En revue", "Validé", "Expiré", "Rejeté"].map((t) => (
              <button key={t} onClick={() => setStatusTab(t)}
                className={`px-3 py-1.5 rounded-md border ${statusTab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Raison sociale</th>
                <th className="text-left px-4 py-3 font-medium">Cible</th>
                <th className="text-left px-3 py-3 font-medium">KYC / AML</th>
                <th className="text-left px-3 py-3 font-medium">Éthique</th>
                <th className="text-left px-3 py-3 font-medium">Fiscal</th>
                <th className="text-left px-3 py-3 font-medium">Composite</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-left px-4 py-3 font-medium">Validité</th>
                <th className="text-left px-4 py-3 font-medium">Resp.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} onClick={() => setSelected(row)}
                  className="border-t border-border hover:bg-accent/40 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{row.id}</td>
                  <td className="px-4 py-3 font-medium">{row.n}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entityTypeLabels[row.type]}</td>
                  <td className="px-3 py-3"><RiskBadge level={row.risk.kycAml} /></td>
                  <td className="px-3 py-3"><RiskBadge level={row.risk.ethique} /></td>
                  <td className="px-3 py-3"><RiskBadge level={row.risk.fiscal} /></td>
                  <td className="px-3 py-3"><RiskBadge level={compositeOf(row.risk)} /></td>
                  <td className="px-4 py-3"><StatusBadge status={row.s} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.validity}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.owner}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun dossier trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          <span className="font-semibold text-primary">Note composite</span> = 40% KYC/AML + 30% Éthique + 30% Fiscal.
          Les entités intragroupe ont par défaut des risques éthique et fiscal élevés (parties liées, prix de transfert).
        </p>
      </Card>

      <NewDossierModal open={createOpen} onOpenChange={setCreateOpen} />
      <DossierDetailModal dossier={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      <Modal
        open={filterOpen} onOpenChange={setFilterOpen}
        title="Filtres avancés"
        footer={
          <>
            <PrimaryButton variant="outline" onClick={() => setFilterOpen(false)}>Annuler</PrimaryButton>
            <PrimaryButton variant="red" onClick={() => { toast.success("Filtres appliqués"); setFilterOpen(false); }}>Appliquer</PrimaryButton>
          </>
        }
      >
        <div className="space-y-3">
          {["Niveau de risque composite", "Risque éthique", "Risque fiscal", "Responsable", "Validité expirant dans"].map((l) => (
            <label key={l} className="block">
              <span className="text-xs font-medium">{l}</span>
              <select className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm">
                <option>Tous</option>
              </select>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
