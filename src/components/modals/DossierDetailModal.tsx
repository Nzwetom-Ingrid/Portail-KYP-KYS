import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton, RiskBadge, StatusBadge } from "@/components/ui-kit";
import { requiredDocsByType, entityTypeLabels, compositeOf, type EntityType, type CompositeRisk } from "@/lib/entity-types";
import { CheckCircle2, Clock, XCircle, FileText, Mail, Send, History, Download } from "lucide-react";
import { toast } from "sonner";
import { decisions, dossiersKypKys, utilisateursInternes } from "@/lib/dataverse/entityHooks";
import { useRole } from "@/lib/role-context";

type Dossier = {
  id: string; n: string; t: string; type: EntityType;
  risk: CompositeRisk;
  s: "Validé" | "En revue" | "Rejeté" | "Brouillon" | "Expiré";
  owner: string; date: string;
  validity?: string;
  email?: string;
};

export function DossierDetailModal({
  dossier, open, onOpenChange,
}: { dossier: Dossier | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [complementOpen, setComplementOpen] = useState(false);
  const [tab, setTab] = useState<"docs" | "audit">("docs");

  const { user } = useRole();
  const updateDossier = dossiersKypKys.useUpdate();
  const createDecision = decisions.useCreate();
  const { data: allDossiers } = dossiersKypKys.useList({ top: 500 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  if (!dossier) return null;
  const docs = requiredDocsByType[dossier.type];

  const findDossierGuid = (): string | undefined => {
    const ref = dossier.id;
    return (allDossiers ?? []).find(
      (d) => d.afb_referencedudossier === ref || d.afb_dossierkypkysid === ref,
    )?.afb_dossierkypkysid;
  };

  const findAuteurGuid = (): string | undefined => {
    const list = userData ?? [];
    const byEmail = user?.email
      ? list.find((u) => (u.afb_adresseemail ?? "").toLowerCase() === user.email.toLowerCase())
      : undefined;
    return (byEmail ?? list[0])?.afb_utilisateurinterneid;
  };

  const newDecisionRef = () =>
    `DEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  const writeDecision = async (
    typeDecision: number,
    niveau: number,
    motif: string,
    elementsACorriger?: string,
  ) => {
    const auteurGuid = findAuteurGuid();
    if (!auteurGuid) return false;
    try {
      await createDecision.mutateAsync({
        afb_identifiantdeladecision: newDecisionRef(),
        afb_typededecision: typeDecision,
        afb_niveaudevalidation: niveau,
        afb_horodatagedeladecision: new Date().toISOString(),
        afb_notesoumotif: motif,
        ...(elementsACorriger ? { afb_elementsacorriger: elementsACorriger } : {}),
        "afb_auteurdeladecision@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
      } as unknown as Parameters<typeof createDecision.mutateAsync>[0]);
      return true;
    } catch (e) {
      toast.error("Décision non enregistrée", {
        description: e instanceof Error ? e.message : "Erreur Dataverse.",
      });
      return false;
    }
  };

  const onReject = async () => {
    const guid = findDossierGuid();
    if (!guid) {
      toast.error(`${dossier.n} introuvable dans Dataverse`, {
        description: "Décision non écrite — ce dossier n'est pas (encore) persisté.",
      });
      return;
    }
    try {
      await updateDossier.mutateAsync({
        id: guid,
        changes: {
          afb_statutdudossier: 747010002, // Rejet_
          afb_commentairedconf: `Dossier rejeté le ${new Date().toLocaleDateString("fr-FR")}.`,
        } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]["changes"],
      });
      await writeDecision(747010001, 747010001, `Rejet du dossier ${dossier.id} — ${dossier.n}.`);
      toast.error(`${dossier.n} rejeté`, { description: "Statut et décision enregistrés dans Dataverse." });
      onOpenChange(false);
    } catch (e) {
      toast.error("Rejet impossible", { description: e instanceof Error ? e.message : "Erreur Dataverse." });
    }
  };

  const onValidate = async () => {
    const guid = findDossierGuid();
    if (!guid) {
      toast.error(`${dossier.n} introuvable dans Dataverse`, {
        description: "Décision non écrite — ce dossier n'est pas (encore) persisté.",
      });
      return;
    }
    try {
      await updateDossier.mutateAsync({
        id: guid,
        changes: {
          afb_statutdudossier: 0, // Valid_
          afb_datededernierevalidation: new Date().toISOString(),
        } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]["changes"],
      });
      await writeDecision(0, 747010000, `Validation du dossier ${dossier.id} — ${dossier.n}.`);
      toast.success(`${dossier.n} validé`, { description: "Statut et décision enregistrés dans Dataverse." });
      onOpenChange(false);
    } catch (e) {
      toast.error("Validation impossible", { description: e instanceof Error ? e.message : "Erreur Dataverse." });
    }
  };

  return (
    <>
      <Modal
        open={open} onOpenChange={onOpenChange}
        title={dossier.n}
        description={`${dossier.id} · ${entityTypeLabels[dossier.type]}`}
        size="xl"
        footer={
          <>
            <PrimaryButton variant="outline" onClick={() => setComplementOpen(true)}>
              <Mail className="h-4 w-4" /> Demander complément
            </PrimaryButton>
            <PrimaryButton variant="red" onClick={onReject} disabled={updateDossier.isPending}>
              <XCircle className="h-4 w-4" /> {updateDossier.isPending ? "…" : "Rejeter"}
            </PrimaryButton>
            <PrimaryButton variant="primary" onClick={onValidate} disabled={updateDossier.isPending}>
              <CheckCircle2 className="h-4 w-4" /> {updateDossier.isPending ? "…" : "Valider"}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat l="Statut" v={<StatusBadge status={dossier.s} />} />
            <Stat l="Risque composite" v={<RiskBadge level={compositeOf(dossier.risk)} />} />
            <Stat l="Responsable" v={dossier.owner} />
            <Stat l="Validité jusqu'au" v={dossier.validity ?? "—"} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat l="KYC / AML" v={<RiskBadge level={dossier.risk.kycAml} />} />
            <Stat l="Éthique (conflits)" v={<RiskBadge level={dossier.risk.ethique} />} />
            <Stat l="Fiscal (pleine conc.)" v={<RiskBadge level={dossier.risk.fiscal} />} />
          </div>

          <div className="flex gap-1 border-b border-border">
            <TabBtn active={tab === "docs"} onClick={() => setTab("docs")} icon={<FileText className="h-3.5 w-3.5" />}>Documents</TabBtn>
            <TabBtn active={tab === "audit"} onClick={() => setTab("audit")} icon={<History className="h-3.5 w-3.5" />}>Journal de traçabilité</TabBtn>
          </div>

          {tab === "docs" && (
            <div>
              <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Documents requis ({entityTypeLabels[dossier.type]})
              </p>
              <ul className="border border-border rounded-lg divide-y divide-border">
                {docs.map((d, i) => {
                  const status = i % 3 === 0 ? "missing" : i % 3 === 1 ? "review" : "ok";
                  return (
                    <li key={d.key} className="flex items-center gap-3 p-3 flex-wrap">
                      {status === "ok" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {status === "review" && <Clock className="h-4 w-4 text-afb-gold" />}
                      {status === "missing" && <XCircle className="h-4 w-4 text-afb-red" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{d.name}</p>
                        {d.hint && <p className="text-xs text-muted-foreground">{d.hint}</p>}
                      </div>
                      <span className={`text-[10px] uppercase font-semibold ${d.mandatory ? "text-afb-red" : "text-muted-foreground"}`}>
                        {d.mandatory ? "Obligatoire" : "Optionnel"}
                      </span>
                      <button className="text-xs text-primary hover:underline">Voir</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === "audit" && <AuditTrail dossierId={dossier.id} />}
        </div>
      </Modal>

      <ComplementModal
        open={complementOpen}
        onOpenChange={setComplementOpen}
        dossier={dossier}
        docs={docs}
        dossierGuid={findDossierGuid()}
        auteurGuid={findAuteurGuid()}
      />
    </>
  );
}

function ComplementModal({
  open, onOpenChange, dossier, docs, dossierGuid, auteurGuid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dossier: Dossier;
  docs: { key: string; name: string; mandatory: boolean; hint?: string }[];
  dossierGuid?: string;
  auteurGuid?: string;
}) {
  const [email, setEmail] = useState(dossier.email ?? "");
  const [deadline, setDeadline] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState(
    `Bonjour,\n\nDans le cadre de l'instruction du dossier ${dossier.id} (${dossier.n}), nous vous invitons à compléter les éléments manquants ci-dessous.\n\nCordialement,\nDirection de la Conformité — Afriland First Bank`,
  );
  const updateDossier = dossiersKypKys.useUpdate();
  const createDecision = decisions.useCreate();

  const toggle = (k: string) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const send = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Email destinataire invalide");
    if (selected.length === 0) return toast.error("Sélectionnez au moins un élément à compléter");
    if (!dossierGuid) {
      toast.error(`${dossier.n} introuvable dans Dataverse`, {
        description: "Demande non écrite — ce dossier n'est pas (encore) persisté.",
      });
      return;
    }
    const docNames = docs
      .filter((d) => selected.includes(d.key))
      .map((d) => d.name)
      .join(" · ");
    try {
      await updateDossier.mutateAsync({
        id: dossierGuid,
        changes: {
          afb_statutdudossier: 2, // _compl_ter
          ...(deadline ? { afb_prochainecheancier: new Date(deadline).toISOString() } : {}),
          afb_commentairedconf: `Complément demandé : ${docNames}`,
        } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]["changes"],
      });
      if (auteurGuid) {
        await createDecision.mutateAsync({
          afb_identifiantdeladecision: `DEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          afb_typededecision: 1, // Demandecompl_ment
          afb_niveaudevalidation: 747010000, // Chargé conformité
          afb_horodatagedeladecision: new Date().toISOString(),
          afb_notesoumotif: `${message}\n\nÉléments demandés : ${docNames}`,
          afb_elementsacorriger: docNames,
          "afb_auteurdeladecision@odata.bind": `/afb_utilisateurinternes(${auteurGuid})`,
        } as unknown as Parameters<typeof createDecision.mutateAsync>[0]);
      }
      toast.success(`Demande envoyée à ${email}`, {
        description: `${selected.length} élément(s) — échéance ${deadline || "non définie"}. Dossier passé en « À compléter » dans Dataverse.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Demande non enregistrée", {
        description: e instanceof Error ? e.message : "Erreur Dataverse.",
      });
    }
  };

  return (
    <Modal
      open={open} onOpenChange={onOpenChange}
      title="Demande de complément d'informations"
      description={`${dossier.id} · ${dossier.n}`}
      size="lg"
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>Annuler</PrimaryButton>
          <PrimaryButton variant="red" onClick={send} disabled={updateDossier.isPending || createDecision.isPending}>
            <Send className="h-4 w-4" /> {updateDossier.isPending || createDecision.isPending ? "…" : "Envoyer la demande"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium">Email du destinataire</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@entreprise.com"
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Échéance souhaitée</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm" />
          </label>
        </div>

        <div>
          <span className="text-xs font-medium">Éléments à compléter</span>
          <div className="mt-1 border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
            {docs.map((d: any) => (
              <label key={d.key} className="flex items-center gap-3 p-2.5 text-sm hover:bg-accent/40 cursor-pointer">
                <input type="checkbox" checked={selected.includes(d.key)} onChange={() => toggle(d.key)}
                  className="h-4 w-4 accent-[oklch(0.58_0.22_27)]" />
                <span className="flex-1">{d.name}</span>
                {d.mandatory && <span className="text-[10px] uppercase text-afb-red font-semibold">Obligatoire</span>}
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium">Message au destinataire</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
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
      <div className="mt-1.5 text-sm font-medium">{v}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-afb-red text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}>
      {icon}{children}
    </button>
  );
}

type AuditEntry = { ts: string; actor: string; role: string; direction: string; action: string; before?: string; after?: string; dconf?: "Validé" | "En attente" | "—" };

const auditMock: AuditEntry[] = [
  { ts: "08/05/2026 10:42", actor: "J. Mbarga", role: "Conformité", direction: "DCONF", action: "Création du dossier", dconf: "—" },
  { ts: "08/05/2026 11:05", actor: "M. Eboa", role: "Chargé relation", direction: "DMG", action: "Ajout document RCCM", dconf: "Validé" },
  { ts: "08/05/2026 14:18", actor: "M. Eboa", role: "Chargé relation", direction: "DMG", action: "Modification champ Risque", before: "Low", after: "Medium", dconf: "En attente" },
  { ts: "08/05/2026 15:30", actor: "Système", role: "Auto", direction: "DCONF", action: "Screening PPE/Sanctions exécuté", dconf: "—" },
  { ts: "08/05/2026 16:02", actor: "S. Nkoa", role: "Conformité", direction: "DCONF", action: "Demande de complément envoyée", dconf: "—" },
];

function AuditTrail({ dossierId }: { dossierId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-primary flex items-center gap-2">
          <History className="h-4 w-4" /> Journal de traçabilité — non modifiable (Art. 38 COBAC)
        </p>
        <PrimaryButton variant="outline" onClick={() => toast.success(`Export PDF généré pour ${dossierId}`)}>
          <Download className="h-3.5 w-3.5" /> Export PDF
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select className="h-9 px-2 rounded-md border border-input bg-card text-xs">
          <option>Toutes les actions</option><option>Modifications</option><option>Documents</option><option>Décisions</option><option>Screening</option>
        </select>
        <select className="h-9 px-2 rounded-md border border-input bg-card text-xs">
          <option>Tous acteurs</option><option>J. Mbarga</option><option>M. Eboa</option><option>S. Nkoa</option>
        </select>
        <input type="month" className="h-9 px-2 rounded-md border border-input bg-card text-xs" />
      </div>

      <ol className="border border-border rounded-lg divide-y divide-border">
        {auditMock.map((a, i) => (
          <li key={i} className="p-3 text-xs">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-sm">{a.action}</p>
                <p className="text-muted-foreground mt-0.5">
                  {a.actor} · {a.role} · <span className="text-primary">{a.direction}</span>
                </p>
                {a.before && (
                  <p className="mt-1"><span className="text-muted-foreground">Avant :</span> <code className="text-afb-red">{a.before}</code> → <span className="text-muted-foreground">Après :</span> <code className="text-success">{a.after}</code></p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-muted-foreground">{a.ts}</p>
                {a.dconf && a.dconf !== "—" && (
                  <span className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] ${a.dconf === "Validé" ? "bg-success/10 text-success" : "bg-afb-gold/20 text-[oklch(0.4_0.1_75)]"}`}>
                    DCONF : {a.dconf}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
