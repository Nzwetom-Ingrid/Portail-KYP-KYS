import { createFileRoute } from "@tanstack/react-router";
import { useRole } from "@/lib/role-context";
import { Card, PageHeader, RiskBadge, StatusBadge, PrimaryButton } from "@/components/ui-kit";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Clock,
  Download,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { NewDossierModal } from "@/components/modals/NewDossierModal";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const trend = [
  { m: "Jan", v: 24 }, { m: "Fév", v: 38 }, { m: "Mar", v: 52 },
  { m: "Avr", v: 47 }, { m: "Mai", v: 71 }, { m: "Jun", v: 88 },
  { m: "Jul", v: 102 }, { m: "Aoû", v: 124 },
];
const riskData = [
  { name: "Low", value: 184, color: "oklch(0.62 0.16 152)" },
  { name: "Medium", value: 67, color: "oklch(0.78 0.15 75)" },
  { name: "High", value: 19, color: "oklch(0.58 0.22 27)" },
];
const slaData = [
  { d: "Lun", v: 12 }, { d: "Mar", v: 18 }, { d: "Mer", v: 9 },
  { d: "Jeu", v: 22 }, { d: "Ven", v: 15 }, { d: "Sam", v: 4 }, { d: "Dim", v: 2 },
];

function Index() {
  const { role } = useRole();
  if (role === "partner") return <PartnerDashboard />;
  return <AdminDashboard isSuper={role === "super-admin"} />;
}

function KPI({
  label, value, delta, icon: Icon, accent,
}: { label: string; value: string; delta?: string; icon: any; accent?: "red" | "gold" | "primary" | "success" }) {
  const accents = {
    red: "bg-afb-red/10 text-afb-red",
    gold: "bg-afb-gold/20 text-[oklch(0.45_0.12_75)]",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-primary mt-2">{value}</p>
          {delta && (
            <p className="text-xs mt-1.5 text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {delta}
            </p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accents[accent ?? "primary"]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  );
}

function AdminDashboard({ isSuper }: { isSuper: boolean }) {
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={isSuper ? "Vue holistique · Conformité KYP/KYS" : "Tableau de bord Conformité"}
        subtitle="Suivi temps réel des dossiers, scoring de risque et alertes SLA — COBAC R-2023/01"
        actions={
          <>
            <PrimaryButton variant="outline" onClick={() => toast.success("Export Excel généré")}>
              <Download className="h-4 w-4" /> Export
            </PrimaryButton>
            <PrimaryButton variant="red" onClick={() => setNewOpen(true)}>
              <FileCheck2 className="h-4 w-4" /> Nouveau dossier
            </PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Dossiers en cours" value="270" delta="+12% ce mois" icon={FileCheck2} accent="primary" />
        <KPI label="Documents expirés" value="23" delta="SLA J-7" icon={Clock} accent="gold" />
        <KPI label="Alertes screening" value="8" delta="PPE / Sanctions" icon={ShieldAlert} accent="red" />
        <KPI label="Validés ce mois" value="142" delta="+9.4%" icon={CheckCircle2} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-primary">Progression des dossiers</h3>
              <p className="text-xs text-muted-foreground">Volume traité — 8 derniers mois</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-accent text-accent-foreground">2025</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.38 0.11 258)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.38 0.11 258)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 255)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.5 0.025 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.025 258)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.91 0.012 255)", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="oklch(0.27 0.09 260)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-primary mb-1">Indicateurs de risque</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribution des scores</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {riskData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {riskData.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="font-medium text-primary">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-primary">Dossiers récents</h3>
            <Link to="/dossiers" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Entité</th>
                  <th className="text-left px-4 py-2.5 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Risque</th>
                  <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                  <th className="text-left px-4 py-2.5 font-medium">SLA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: "SOCAPALM SA", t: "Fournisseur", r: "low" as const, s: "Validé" as const, sla: "—" },
                  { n: "Global Trade Cameroun", t: "Partenaire", r: "medium" as const, s: "En revue" as const, sla: "J-3" },
                  { n: "PetroAfrica Holdings", t: "Partenaire", r: "high" as const, s: "En revue" as const, sla: "J-1" },
                  { n: "Logistics Cameroon Ltd", t: "Fournisseur", r: "low" as const, s: "Brouillon" as const, sla: "—" },
                  { n: "Sahel Imports SARL", t: "Fournisseur", r: "medium" as const, s: "Expiré" as const, sla: "Dépassé" },
                ].map((row, i) => (
                  <tr key={i} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{row.n}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.t}</td>
                    <td className="px-4 py-3"><RiskBadge level={row.r} /></td>
                    <td className="px-4 py-3"><StatusBadge status={row.s} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{row.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-primary">Alertes SLA</h3>
            <span className="px-2 py-0.5 rounded-md bg-afb-red/10 text-afb-red text-xs font-medium">
              7 jours
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Documents arrivant à expiration</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 255)" vertical={false} />
                <XAxis dataKey="d" fontSize={11} stroke="oklch(0.5 0.025 258)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="oklch(0.5 0.025 258)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="v" fill="oklch(0.58 0.22 27)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 rounded-md bg-afb-gold/10 border border-afb-gold/30 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-[oklch(0.45_0.12_75)] shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <strong>3 dossiers</strong> dépassent le SLA réglementaire — relance automatique programmée.
            </p>
          </div>
        </Card>
      </div>
      <NewDossierModal open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function PartnerDashboard() {
  const steps = [
    { l: "Identité entreprise", done: true },
    { l: "Documents légaux (KYB)", done: true },
    { l: "Bénéficiaires effectifs (UBO)", done: true },
    { l: "Déclarations fiscales", done: false },
    { l: "Signature électronique", done: false },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Bienvenue sur votre espace partenaire"
        subtitle="Complétez votre dossier de conformité KYP en toute sécurité."
        actions={
          <Link to="/onboarding">
            <PrimaryButton variant="red">
              <UploadCloud className="h-4 w-4" /> Continuer mon dossier
            </PrimaryButton>
          </Link>
        }
      />

      <Card className="bg-[image:var(--gradient-primary)] text-primary-foreground border-0">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">Complétion du profil</p>
            <p className="text-4xl font-bold mt-1">{pct}%</p>
            <p className="text-sm text-white/80 mt-1">
              {completed} sur {steps.length} étapes complétées
            </p>
          </div>
          <div className="h-24 w-24 relative">
            <svg className="h-full w-full -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="none" />
              <circle
                cx="48" cy="48" r="40"
                stroke="oklch(0.78 0.15 85)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(pct / 100) * 251} 251`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {pct}%
            </span>
          </div>
        </div>
        <div className="mt-5 h-2 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full bg-afb-gold" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-primary mb-4">Étapes d'onboarding</h3>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  s.done ? "border-success/30 bg-success/5" : "border-border bg-card"
                }`}
              >
                <span
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    s.done
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`flex-1 text-sm ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.l}
                </span>
                {s.done ? (
                  <StatusBadge status="Validé" />
                ) : (
                  <Link to="/onboarding"><PrimaryButton variant="outline">Compléter</PrimaryButton></Link>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h3 className="font-semibold text-primary mb-3">Statut d'approbation</h3>
          <div className="space-y-3">
            {[
              { l: "Soumission", done: true },
              { l: "Revue conformité", done: true },
              { l: "Screening PPE/Sanctions", done: false, current: true },
              { l: "Validation finale", done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    s.done ? "bg-success" : (s as any).current ? "bg-afb-red animate-pulse" : "bg-border"
                  }`}
                />
                <span className={`text-sm ${s.done || (s as any).current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.l}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-md border border-border bg-muted/40 text-xs text-muted-foreground">
            <strong className="text-primary">Sécurité :</strong> authentification OTP active. Vos documents sont chiffrés dans le coffre-fort numérique.
          </div>
        </Card>
      </div>
    </div>
  );
}
