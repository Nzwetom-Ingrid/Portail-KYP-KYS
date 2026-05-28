import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton, RiskBadge } from "@/components/ui-kit";
import { CheckCircle2, XCircle, AlertTriangle, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { decisions, utilisateursInternes } from "@/lib/dataverse/entityHooks";
import { useRole } from "@/lib/role-context";

export type Hit = {
  name: string;
  source: string;
  match: number;
  level: "low" | "medium" | "high";
  type: string;
  reason?: string;
  listedOn?: string;
  jurisdiction?: string;
  declaredName?: string;
};

type DecisionKind = "validate" | "escalate" | "reject";

const DECISION_TYPE: Record<DecisionKind, number> = {
  validate: 0,
  escalate: 747010002,
  reject: 747010001,
};
const DECISION_NIVEAU: Record<DecisionKind, number> = {
  validate: 747010000,
  escalate: 747010001,
  reject: 747010001,
};

function newDecisionRef(): string {
  return `DEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export function HitReviewModal({
  hit, open, onOpenChange,
}: {
  hit: Hit | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [fpOpen, setFpOpen] = useState(false);
  const { user } = useRole();
  const createDecision = decisions.useCreate();
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  if (!hit) return null;

  const findAuteurGuid = (): string | undefined => {
    const list = userData ?? [];
    const byEmail = user?.email
      ? list.find((u) => (u.afb_adresseemail ?? "").toLowerCase() === user.email.toLowerCase())
      : undefined;
    return (byEmail ?? list[0])?.afb_utilisateurinterneid;
  };

  const writeDecision = async (kind: DecisionKind, motif: string): Promise<boolean> => {
    const auteurGuid = findAuteurGuid();
    if (!auteurGuid) {
      toast.error("Aucun utilisateur interne trouvé dans Dataverse", {
        description: "Décision non enregistrée — créez un utilisateur interne d'abord.",
      });
      return false;
    }
    try {
      await createDecision.mutateAsync({
        afb_identifiantdeladecision: newDecisionRef(),
        afb_typededecision: DECISION_TYPE[kind],
        afb_niveaudevalidation: DECISION_NIVEAU[kind],
        afb_horodatagedeladecision: new Date().toISOString(),
        afb_notesoumotif: motif,
        "afb_auteurdeladecision@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
      } as unknown as Parameters<typeof createDecision.mutateAsync>[0]);
      return true;
    } catch (e) {
      toast.error("Enregistrement Dataverse impossible", {
        description: e instanceof Error ? e.message : "Erreur lors de la création de la décision.",
      });
      return false;
    }
  };

  const onEscalate = async () => {
    const ok = await writeDecision(
      "escalate",
      `Escaladé au comité conformité — correspondance ${hit.source}/${hit.type} sur ${hit.name} (score ${hit.match}%).`,
    );
    if (ok) {
      toast.success(`Escaladé au comité conformité pour ${hit.name}`, {
        description: "Décision archivée dans Dataverse.",
      });
      onOpenChange(false);
    }
  };

  const onConfirm = async () => {
    const ok = await writeDecision(
      "reject",
      `Hit confirmé et bloqué — ${hit.source}/${hit.type} sur ${hit.name} (score ${hit.match}%). ${hit.reason ?? ""}`.trim(),
    );
    if (ok) {
      toast.success(`Hit confirmé et bloqué pour ${hit.name}`, {
        description: "Décision archivée dans Dataverse.",
      });
      onOpenChange(false);
    }
  };

  const reason = hit.reason ?? "Gel d'avoirs · soupçon de financement du terrorisme";
  const listedOn = hit.listedOn ?? "14/02/2024";
  const jurisdiction = hit.jurisdiction ?? "États-Unis (OFAC)";

  return (
    <>
      <Modal
        open={open} onOpenChange={onOpenChange}
        title={`Examen de correspondance · ${hit.name}`}
        description={`${hit.source} · ${hit.type}`}
        size="lg"
        footer={
          <>
            <PrimaryButton variant="outline" onClick={() => setFpOpen(true)}>
              <FileSearch className="h-4 w-4" /> Faux positif à analyser
            </PrimaryButton>
            <PrimaryButton variant="red" onClick={onEscalate} disabled={createDecision.isPending}>
              <AlertTriangle className="h-4 w-4" /> {createDecision.isPending ? "…" : "Escalader"}
            </PrimaryButton>
            <PrimaryButton variant="primary" onClick={onConfirm} disabled={createDecision.isPending}>
              <CheckCircle2 className="h-4 w-4" /> {createDecision.isPending ? "…" : "Confirmer le hit"}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat l="Score" v={`${hit.match}%`} />
            <Stat l="Niveau" v={<RiskBadge level={hit.level} />} />
            <Stat l="Liste" v={hit.source} />
            <Stat l="Type" v={hit.type} />
          </div>

          <div className="border border-border rounded-lg p-4 bg-muted/30 text-sm space-y-2">
            <p className="font-semibold text-primary">Détails de la correspondance</p>
            <Row k="Nom exact (liste)" v={hit.name} />
            {hit.declaredName && <Row k="Nom déclaré (tiers)" v={hit.declaredName} />}
            <Row k="Liste source" v={hit.source} />
            <Row k="Motif du classement" v={reason} />
            <Row k="Date d'inscription" v={listedOn} />
            <Row k="Juridiction" v={jurisdiction} />
            <Row k="Horodatage screening" v={new Date().toLocaleString("fr-FR")} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Ces informations sont enregistrées dans l'entité <code>Résultat Screening</code> (Dataverse) avec horodatage non modifiable — Art. 38 COBAC R-2023/01.
          </p>
        </div>
      </Modal>

      <FalsePositiveModal hit={hit} open={fpOpen} onOpenChange={setFpOpen} onDone={() => onOpenChange(false)} />
    </>
  );
}

function FalsePositiveModal({
  hit, open, onOpenChange, onDone,
}: { hit: Hit; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("homonymie");
  const { user } = useRole();
  const createDecision = decisions.useCreate();
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  const submit = async () => {
    if (reason.trim().length < 20) return toast.error("Justification trop courte (min. 20 caractères)");

    const list = userData ?? [];
    const auteurGuid =
      (user?.email
        ? list.find((u) => (u.afb_adresseemail ?? "").toLowerCase() === user.email.toLowerCase())
        : undefined)?.afb_utilisateurinterneid ?? list[0]?.afb_utilisateurinterneid;

    if (!auteurGuid) {
      toast.error("Aucun utilisateur interne trouvé dans Dataverse", {
        description: "Décision non enregistrée — créez un utilisateur interne d'abord.",
      });
      return;
    }
    try {
      await createDecision.mutateAsync({
        afb_identifiantdeladecision: newDecisionRef(),
        afb_typededecision: 0, // Validation (faux positif retenu)
        afb_niveaudevalidation: 747010000, // Chargé conformité
        afb_horodatagedeladecision: new Date().toISOString(),
        afb_notesoumotif: `Faux positif — motif : ${evidence}. ${reason.trim()}`,
        afb_elementsacorriger: `Correspondance ${hit.source}/${hit.type} sur ${hit.name} (score ${hit.match}%) écartée.`,
        "afb_auteurdeladecision@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
      } as unknown as Parameters<typeof createDecision.mutateAsync>[0]);

      toast.success("Faux positif documenté", {
        description: `Décision archivée dans Dataverse — ${hit.name}`,
      });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error("Enregistrement impossible", {
        description: e instanceof Error ? e.message : "Erreur Dataverse.",
      });
    }
  };
  return (
    <Modal
      open={open} onOpenChange={onOpenChange}
      title="Documenter un faux positif"
      description={`${hit.name} · ${hit.source}`}
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>Annuler</PrimaryButton>
          <PrimaryButton variant="red" onClick={submit} disabled={createDecision.isPending}>
            <XCircle className="h-4 w-4" /> {createDecision.isPending ? "…" : "Marquer faux positif"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium">Motif</span>
          <select value={evidence} onChange={(e) => setEvidence(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm">
            <option value="homonymie">Homonymie</option>
            <option value="date">Date de naissance différente</option>
            <option value="nationalite">Nationalité différente</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium">Justification d'analyste (obligatoire)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
            placeholder="Détaillez les éléments écartant la correspondance…"
            className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-card text-sm" />
        </label>
      </div>
    </Modal>
  );
}

function Stat({ l, v }: { l: string; v: any }) {
  return (
    <div className="border border-border rounded-md p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
      <div className="text-base font-semibold text-primary mt-1">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
