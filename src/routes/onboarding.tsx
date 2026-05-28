import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import {
  ChevronRight, ChevronLeft, Save, Send, CheckCircle2, Circle,
  Building2, Users2, Briefcase, ShieldCheck, FileSignature, Network,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

// Sections inspirées du QUESTIONNAIRE AML/KYC d'Afriland First Bank
type Question = {
  id: string;
  label: string;
  type: "text" | "long" | "yesno" | "date" | "number";
  required?: boolean;
  hint?: string;
};

type Section = {
  id: string;
  title: string;
  icon: any;
  description?: string;
  questions: Question[];
};

const sections: Section[] = [
  {
    id: "I",
    title: "I — Informations générales",
    icon: Building2,
    description: "Identification réglementaire de l'institution.",
    questions: [
      { id: "raison", label: "Raison sociale de l'entité", type: "text", required: true },
      { id: "adresse", label: "Adresse complète du siège social (pays, région, ville, rue)", type: "long", required: true },
      { id: "contact", label: "Contact (e-mail, téléphone, BP, fax)", type: "long", required: true },
      { id: "tax-country", label: "Pays de résidence fiscale", type: "text", required: true },
      { id: "tin", label: "Numéro d'identification fiscale", type: "text", required: true },
      { id: "agrement", label: "Agrément (référence, date et lieu de délivrance)", type: "text", required: true },
      { id: "rccm", label: "Extrait du registre de commerce (référence, date, lieu)", type: "text", required: true },
      { id: "activites", label: "Activités entrant dans l'objet social", type: "long", required: true },
      { id: "swift", label: "Code SWIFT", type: "text", hint: "Si applicable" },
      { id: "fatca-id", label: "Identifiant FATCA (GIIN)", type: "text", hint: "Si applicable" },
      { id: "branches-local", label: "Nombre d'agences dans le pays de résidence fiscale", type: "number" },
      { id: "branches-foreign", label: "Nombre d'agences hors du pays de résidence fiscale", type: "long", hint: "Préciser si situées en juridictions sous sanctions ONU/UE/OFAC" },
      { id: "regulator", label: "Régulateur ou organisme de surveillance", type: "text", required: true },
      { id: "media", label: "Couverture médiatique négative LCB-FT/corruption au cours des 3 dernières années ?", type: "yesno", required: true },
      { id: "sanctions", label: "Sanctions reçues (LCB-FT, fraude, corruption) sur 3 ans ?", type: "yesno", required: true },
      { id: "sanctions-detail", label: "Si oui, détails des carences et mesures correctives", type: "long" },
    ],
  },
  {
    id: "II",
    title: "II — Structure de l'actionnariat",
    icon: Network,
    description: "Liste de tous les actionnaires détenant ≥ 10 % (directs ou indirects).",
    questions: [
      { id: "shareholders", label: "Liste complète des actionnaires (nom, date/lieu de naissance, nationalité, pays résidence fiscale, % détention)", type: "long", required: true, hint: "Inclure toute la chaîne ≥ 10%" },
      { id: "ubo-chain", label: "Schéma de la chaîne de détention (organigramme)", type: "long", required: true },
      { id: "controlling", label: "Identifier l'actionnaire de contrôle ultime (UBO final)", type: "text", required: true },
    ],
  },
  {
    id: "III",
    title: "III — Bénéficiaires effectifs (UBO)",
    icon: Users2,
    description: "Toute personne physique détenant ≥ 10 % directement ou indirectement.",
    questions: [
      { id: "ubo-list", label: "Liste UBO ≥ 10 % (nom, date naissance, nationalité, % effectif, pièce d'identité)", type: "long", required: true },
      { id: "ppe", label: "L'un des UBO est-il une Personne Politiquement Exposée (PPE) ?", type: "yesno", required: true },
      { id: "ppe-detail", label: "Si oui, préciser fonction, pays et lien", type: "long" },
    ],
  },
  {
    id: "IV",
    title: "IV — Conseil d'administration",
    icon: Briefcase,
    description: "Membres exécutifs, indépendants ou non-exécutifs.",
    questions: [
      { id: "board", label: "Liste des administrateurs (nom, fonction, statut exécutif/indépendant)", type: "long", required: true },
    ],
  },
  {
    id: "V",
    title: "V — Dirigeants",
    icon: Users2,
    questions: [
      { id: "managers", label: "Liste des dirigeants (DG, DGA, responsables clés)", type: "long", required: true },
      { id: "compliance-officer", label: "Responsable conformité (nom, contact, ancienneté)", type: "text", required: true },
    ],
  },
  {
    id: "VI",
    title: "VI — Politique LCB-FT & sanctions",
    icon: ShieldCheck,
    description: "Dispositif anti-blanchiment et lutte contre le financement du terrorisme.",
    questions: [
      { id: "policy", label: "Disposez-vous d'une politique LCB-FT formalisée et approuvée ?", type: "yesno", required: true },
      { id: "policy-date", label: "Date de la dernière mise à jour de la politique", type: "date" },
      { id: "training", label: "Plan de formation LCB-FT du personnel ?", type: "yesno", required: true },
      { id: "screening", label: "Outil de screening utilisé (Dow Jones, Refinitiv, autres) ?", type: "text" },
      { id: "edd", label: "Mesures de vigilance renforcée appliquées aux PPE, banques correspondantes, juridictions à risque ?", type: "yesno", required: true },
      { id: "audit", label: "Audit indépendant LCB-FT réalisé sur les 24 derniers mois ?", type: "yesno" },
      { id: "fatca-crs", label: "Conformité FATCA / CRS (W-8BEN-E disponible) ?", type: "yesno", required: true },
      { id: "wolfsberg", label: "Avez-vous rempli le questionnaire Wolfsberg CBDDQ ?", type: "yesno" },
    ],
  },
  {
    id: "VII",
    title: "VII — Certification & signature",
    icon: FileSignature,
    description: "Engagement du déclarant sur la véracité des informations.",
    questions: [
      { id: "certifier", label: "Nom et fonction du certificateur", type: "text", required: true },
      { id: "cert-date", label: "Date de certification", type: "date", required: true },
      { id: "engagement", label: "Je certifie que les informations communiquées sont actualisées, exactes et reflètent les dispositifs KYC/LCB-FT/Sanctions de mon établissement.", type: "yesno", required: true },
    ],
  },
];

function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const section = sections[current];

  const completion = useMemo(() => {
    const total = sections.flatMap((s) => s.questions).filter((q) => q.required).length;
    const done = sections
      .flatMap((s) => s.questions)
      .filter((q) => q.required && (answers[q.id]?.trim() ?? "") !== "").length;
    return { total, done, pct: Math.round((done / total) * 100) };
  }, [answers]);

  const sectionDone = (s: Section) =>
    s.questions.filter((q) => q.required).every((q) => (answers[q.id]?.trim() ?? "") !== "");

  const setAnswer = (qid: string, v: string) => setAnswers((a) => ({ ...a, [qid]: v }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Onboarding KYC / KYP / KYS"
        subtitle="Questionnaire AML d'Afriland First Bank — Réglementation COBAC R-2023/01"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar sections */}
        <Card className="p-3 lg:sticky lg:top-4 self-start">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground">Progression</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[image:var(--gradient-primary)]" style={{ width: `${completion.pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-primary">{completion.pct}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{completion.done}/{completion.total} obligatoires</p>
          </div>
          <ul className="space-y-1">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const done = sectionDone(s);
              const active = i === current;
              return (
                <li key={s.id}>
                  <button onClick={() => setCurrent(i)}
                    className={`w-full flex items-start gap-2 text-left px-2 py-2 rounded-md text-xs transition-colors ${
                      active ? "bg-afb-red/10 text-afb-red font-medium" : "hover:bg-accent text-foreground"
                    }`}>
                    {done ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        <span className="truncate">{s.title}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Section content */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3 pb-4 mb-4 border-b border-border">
              <span className="h-9 w-9 rounded-md bg-afb-red text-afb-red-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                {section.id}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-primary">{section.title}</h2>
                {section.description && <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>}
              </div>
              <span className="text-xs text-muted-foreground">
                Étape {current + 1}/{sections.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.questions.map((q) => (
                <QField key={q.id} q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswer(q.id, v)} />
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border flex-wrap gap-2">
              <PrimaryButton variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4" /> Précédent
              </PrimaryButton>
              <div className="flex gap-2">
                <PrimaryButton variant="outline" onClick={() => toast.success("Brouillon enregistré dans Dataverse")}>
                  <Save className="h-4 w-4" /> Enregistrer brouillon
                </PrimaryButton>
                {current < sections.length - 1 ? (
                  <PrimaryButton variant="red" onClick={() => setCurrent(current + 1)}>
                    Section suivante <ChevronRight className="h-4 w-4" />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton variant="red" onClick={() => toast.success("Dossier soumis à la DCONF", {
                    description: "Workflow Power Automate déclenché — accusé de réception envoyé."
                  })}>
                    <Send className="h-4 w-4" /> Soumettre le dossier
                  </PrimaryButton>
                )}
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-afb-gold">
            <p className="text-[11px] uppercase tracking-wider text-[oklch(0.45_0.12_75)] font-semibold">
              Conformité réglementaire
            </p>
            <p className="text-xs text-foreground mt-1">
              Données protégées · Loi camerounaise N°2010/012 et règlement COBAC R-2023/01.
              Conservation : 10 ans (Art. 38). Toutes les actions sont horodatées et non modifiables.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const cls = "mt-1 w-full px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";
  return (
    <label className={`block ${q.type === "long" ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium">
        {q.label}
        {q.required && <span className="text-afb-red ml-1">*</span>}
      </span>
      {q.type === "long" ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} py-2`} />
      ) : q.type === "yesno" ? (
        <div className="flex gap-2 mt-1">
          {["Oui", "Non"].map((v) => (
            <button key={v} type="button" onClick={() => onChange(v)}
              className={`px-4 h-9 rounded-md border text-sm ${value === v ? "border-afb-red bg-afb-red/10 text-afb-red font-medium" : "border-border hover:bg-accent"}`}>
              {v}
            </button>
          ))}
        </div>
      ) : (
        <input type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
          value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} h-10`} />
      )}
      {q.hint && <span className="text-[10px] text-muted-foreground mt-0.5 block">{q.hint}</span>}
    </label>
  );
}
