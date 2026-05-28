import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, RiskBadge, PrimaryButton } from "@/components/ui-kit";
import {
  Database, Plus, Download, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, Network,
} from "lucide-react";
import { AddUboModal } from "@/components/modals/AddUboModal";
import { toast } from "sonner";

export const Route = createFileRoute("/dataverse")({ component: Dataverse });

type VerifStatus = "verified" | "pending" | "blocked";
type Ubo = {
  name: string;
  entity: string;
  share: string;
  level: number; // 1 = direct, 2 = N-1, etc.
  parent?: string;
  nat: string;
  ppe: boolean;
  risk: "low" | "medium" | "high";
  verif: VerifStatus;
  source: "déclaré par la cible" | "vérifié DCONF" | "import Dataverse";
};

// Chaîne UBO complète : tout actionnaire ≥ 10% doit être identifié et screené
const ubos: Ubo[] = [
  // SOCAPALM SA — chaîne directe
  { name: "Jean-Paul Mvondo", entity: "SOCAPALM SA", share: "32%", level: 1, nat: "Camerounaise", ppe: false, risk: "low", verif: "verified", source: "vérifié DCONF" },
  { name: "Holding MV Invest", entity: "SOCAPALM SA", share: "28%", level: 1, nat: "Camerounaise", ppe: false, risk: "low", verif: "verified", source: "vérifié DCONF" },
  { name: "Pierre Ndongo", entity: "Holding MV Invest", share: "60% (≈16,8% indirect)", level: 2, parent: "Holding MV Invest", nat: "Camerounaise", ppe: false, risk: "low", verif: "pending", source: "déclaré par la cible" },
  { name: "Famille Mvondo (3 pers.)", entity: "Holding MV Invest", share: "40% (≈11,2% indirect)", level: 2, parent: "Holding MV Invest", nat: "Camerounaise", ppe: false, risk: "low", verif: "pending", source: "déclaré par la cible" },

  // Global Trade Cameroun
  { name: "Aminata Diallo", entity: "Global Trade Cameroun", share: "51%", level: 1, nat: "Sénégalaise", ppe: true, risk: "medium", verif: "verified", source: "vérifié DCONF" },
  { name: "Kofi Asante", entity: "Global Trade Cameroun", share: "22%", level: 1, nat: "Ghanéenne", ppe: false, risk: "low", verif: "pending", source: "déclaré par la cible" },
  { name: "GT Investments Ltd (Maurice)", entity: "Global Trade Cameroun", share: "15%", level: 1, nat: "Mauricienne", ppe: false, risk: "medium", verif: "pending", source: "déclaré par la cible" },

  // PetroAfrica Holdings — alerte
  { name: "Robert Tchoungui", entity: "PetroAfrica Holdings", share: "27%", level: 1, nat: "Camerounaise", ppe: true, risk: "high", verif: "blocked", source: "vérifié DCONF" },
  { name: "PA Energy SARL", entity: "PetroAfrica Holdings", share: "18%", level: 1, nat: "Camerounaise", ppe: false, risk: "medium", verif: "pending", source: "déclaré par la cible" },

  // Cameroon Telecom Group
  { name: "Marie Essomba", entity: "Cameroon Telecom Group", share: "18%", level: 1, nat: "Camerounaise", ppe: false, risk: "low", verif: "verified", source: "vérifié DCONF" },
  { name: "Alain Kemi", entity: "Cameroon Telecom Group", share: "12%", level: 1, nat: "Camerounaise", ppe: false, risk: "low", verif: "pending", source: "déclaré par la cible" },

  // Sahel Imports
  { name: "Ibrahim Sani", entity: "Sahel Imports SARL", share: "44%", level: 1, nat: "Tchadienne", ppe: false, risk: "medium", verif: "verified", source: "vérifié DCONF" },
  { name: "Sahel Trading FZE (Dubaï)", entity: "Sahel Imports SARL", share: "20%", level: 1, nat: "Émiratie", ppe: false, risk: "high", verif: "pending", source: "déclaré par la cible" },

  // AgroNord
  { name: "Pascal Owono", entity: "AgroNord SARL", share: "60%", level: 1, nat: "Camerounaise", ppe: false, risk: "high", verif: "verified", source: "vérifié DCONF" },

  // Intragroupe
  { name: "AFB Holding SA", entity: "AFB Assurance SA", share: "85%", level: 1, nat: "Camerounaise", ppe: false, risk: "low", verif: "verified", source: "vérifié DCONF" },
  { name: "Paul Fokam", entity: "AFB Holding SA", share: "35% (≈29,75% indirect)", level: 2, parent: "AFB Holding SA", nat: "Camerounaise", ppe: false, risk: "medium", verif: "verified", source: "vérifié DCONF" },
];

const verifLabel: Record<VerifStatus, { label: string; cls: string; icon: any }> = {
  verified: { label: "Vérifié", cls: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  pending: { label: "À vérifier", cls: "bg-afb-gold/15 text-[oklch(0.4_0.1_75)] border-afb-gold/40", icon: Clock },
  blocked: { label: "Bloqué", cls: "bg-afb-red/10 text-afb-red border-afb-red/30", icon: AlertTriangle },
};

function Dataverse() {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | VerifStatus>("all");

  const filtered = ubos.filter((u) => filter === "all" || u.verif === filter);

  const counts = {
    total: ubos.length,
    verified: ubos.filter((u) => u.verif === "verified").length,
    pending: ubos.filter((u) => u.verif === "pending").length,
    blocked: ubos.filter((u) => u.verif === "blocked").length,
    ppe: ubos.filter((u) => u.ppe).length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Dataverse · Chaîne complète des bénéficiaires effectifs (UBO)"
        subtitle="Toute personne détenant ≥ 10 % directement ou indirectement doit être identifiée et screenée — pas seulement l'actionnaire principal."
        actions={
          <>
            <PrimaryButton variant="outline" onClick={() => toast.success("Export CSV de la chaîne UBO généré")}>
              <Download className="h-4 w-4" />Exporter chaîne
            </PrimaryButton>
            <PrimaryButton variant="red" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />Ajouter UBO
            </PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: "UBO référencés", v: counts.total, icon: Database, c: "text-primary" },
          { l: "Vérifiés", v: counts.verified, icon: CheckCircle2, c: "text-success" },
          { l: "À vérifier (déclarés)", v: counts.pending, icon: Clock, c: "text-afb-gold" },
          { l: "Bloqués / sanctions", v: counts.blocked, icon: AlertTriangle, c: "text-afb-red" },
          { l: "Personnes PPE", v: counts.ppe, icon: ShieldCheck, c: "text-afb-red" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.l}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
                <Icon className={`h-4 w-4 ${k.c}`} />
              </div>
              <p className={`text-2xl font-bold ${k.c} mt-2`}>{k.v}</p>
            </Card>
          );
        })}
      </div>

      <Card className="border-l-4 border-l-afb-gold">
        <div className="flex items-start gap-3">
          <Network className="h-5 w-5 text-[oklch(0.45_0.12_75)] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Règle « chaîne complète »</p>
            <p className="text-muted-foreground text-xs mt-1">
              Pour chaque dossier, tout actionnaire ≥ 10 % (direct ou indirect via une holding) doit être ajouté au registre.
              Les UBO déclarés par la cible sont marqués <strong>« À vérifier »</strong> jusqu'à validation par la DCONF
              (screening sanctions / PPE). Aucun dossier ne peut être validé tant que des UBO de niveau 1 ou 2 restent non vérifiés.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h3 className="font-semibold text-primary">Registre UBO — chaîne bénéficiaire</h3>
          <div className="flex gap-2 text-xs">
            {([
              { k: "all", l: `Tous (${counts.total})` },
              { k: "pending", l: `À vérifier (${counts.pending})` },
              { k: "verified", l: `Vérifiés (${counts.verified})` },
              { k: "blocked", l: `Bloqués (${counts.blocked})` },
            ] as const).map((t) => (
              <button key={t.k} onClick={() => setFilter(t.k)}
                className={`px-3 py-1.5 rounded-md border ${filter === t.k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Bénéficiaire</th>
                <th className="text-left px-4 py-3 font-medium">Entité / Holding</th>
                <th className="text-left px-4 py-3 font-medium">Niveau</th>
                <th className="text-left px-4 py-3 font-medium">Détention</th>
                <th className="text-left px-4 py-3 font-medium">Nationalité</th>
                <th className="text-left px-4 py-3 font-medium">PPE</th>
                <th className="text-left px-4 py-3 font-medium">Risque</th>
                <th className="text-left px-4 py-3 font-medium">Vérification</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => {
                const v = verifLabel[u.verif];
                const VIcon = v.icon;
                return (
                  <tr key={`${u.name}-${idx}`} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3" style={{ paddingLeft: (u.level - 1) * 16 }}>
                        {u.level > 1 && <span className="text-muted-foreground text-xs">↳</span>}
                        <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </span>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.entity}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.level === 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        N{u.level === 1 ? "" : `-${u.level - 1}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{u.share}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.nat}</td>
                    <td className="px-4 py-3">
                      {u.ppe ? <span className="px-2 py-0.5 rounded-md bg-afb-red/10 text-afb-red text-xs font-medium">PPE</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={u.risk} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${v.cls}`}>
                        <VIcon className="h-3 w-3" />{v.label}
                      </span>
                      {u.verif === "pending" && (
                        <button
                          onClick={() => toast.success(`Screening lancé — ${u.name}`, { description: "Vérification Dow Jones / Refinitiv en cours" })}
                          className="ml-2 text-[10px] text-primary hover:underline">
                          Vérifier
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground italic">{u.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <AddUboModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
