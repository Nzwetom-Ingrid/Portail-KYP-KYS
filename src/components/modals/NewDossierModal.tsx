import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import {
  entityTypeDescriptions, entityTypeLabels,
  requiredDocsByType, entityTypeValidityMonths,
  type EntityType,
} from "@/lib/entity-types";
import { Banknote, Handshake, Truck, FileCheck2, Circle, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  dossiersKypKys,
  partnerTypes,
  tiers,
  utilisateursInternes,
} from "@/lib/dataverse/entityHooks";
import { useRole } from "@/lib/role-context";

const icons: Record<EntityType, any> = {
  correspondant: Banknote,
  partenaire: Handshake,
  fournisseur: Truck,
  intragroupe: Building2,
};

const REF_PREFIX: Record<EntityType, string> = {
  correspondant: "KYC-B",
  partenaire: "KYP",
  fournisseur: "KYS",
  intragroupe: "KYI",
};

function newDossierRef(t: EntityType): string {
  const year = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `${REF_PREFIX[t]}-${year}-${n}`;
}

export function NewDossierModal({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState<EntityType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");

  const { user } = useRole();
  const createTiers = tiers.useCreate();
  const createDossier = dossiersKypKys.useCreate();
  const { data: ptData } = partnerTypes.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  const submit = async () => {
    if (!type || !name) return toast.error("Type et raison sociale obligatoires");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Email destinataire invalide");

    const ptGuid = ptData?.[0]?.afb_partnertypeid;
    if (!ptGuid) {
      return toast.error("Aucun type juridique dans Dataverse", {
        description: "Créez au moins un type de partenaire avant d'enregistrer un dossier.",
      });
    }
    const userList = userData ?? [];
    const chargeGuid =
      (user?.email
        ? userList.find((u) => (u.afb_adresseemail ?? "").toLowerCase() === user.email.toLowerCase())
        : undefined)?.afb_utilisateurinterneid ?? userList[0]?.afb_utilisateurinterneid;
    if (!chargeGuid) {
      return toast.error("Aucun utilisateur interne dans Dataverse", {
        description: "Créez un utilisateur interne pour endosser le rôle de chargé de relation.",
      });
    }

    const ref = newDossierRef(type);
    try {
      const newTiers = await createTiers.mutateAsync({
        afb_nomdupartenaire: name.trim(),
        afb_pays: "Cameroun",
        afb_directionporteuse: 1, // DCONF
        afb_niveauderisque: 2, // Standard
        afb_statutdutiers: 0, // Partenaireactif
        afb_datedecreationsysteme: new Date().toISOString(),
        afb_emailcontactprincipal: email,
        "afb_typejuridique@odata.bind": `/afb_partnertypes(${ptGuid})`,
        "afb_chargederelation@odata.bind": `/afb_utilisateurinternes(${chargeGuid})`,
      } as unknown as Parameters<typeof createTiers.mutateAsync>[0]);

      await createDossier.mutateAsync({
        afb_referencedudossier: ref,
        afb_statutdudossier: 1, // En revue
        afb_tauxdecompletude: 0,
        afb_versiondudossier: 1,
        afb_datedesoumission: new Date().toISOString(),
        "afb_nomdutiers@odata.bind": `/afb_tierses(${newTiers.afb_tiersid})`,
      } as unknown as Parameters<typeof createDossier.mutateAsync>[0]);

      toast.success(`Dossier ${entityTypeLabels[type]} créé pour ${name}`, {
        description: `${ref} · Invitation envoyée à ${email}${contact ? ` (${contact})` : ""}. Validité par défaut ${entityTypeValidityMonths[type]} mois.`,
      });
      setType(null); setName(""); setEmail(""); setContact("");
      onOpenChange(false);
    } catch (e) {
      toast.error("Création impossible", {
        description: e instanceof Error ? e.message : "Erreur Dataverse.",
      });
    }
  };

  return (
    <Modal
      open={open} onOpenChange={onOpenChange}
      title="Nouveau dossier de conformité"
      description="Sélectionnez la cible — les documents requis et la durée de validité par défaut s'adaptent automatiquement."
      size="xl"
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>Annuler</PrimaryButton>
          <PrimaryButton
            variant="red"
            onClick={submit}
            disabled={createTiers.isPending || createDossier.isPending}
          >
            <FileCheck2 className="h-4 w-4" />
            {createTiers.isPending || createDossier.isPending
              ? "Création…"
              : "Créer & envoyer l'invitation"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(entityTypeLabels) as EntityType[]).map((t) => {
            const Icon = icons[t]; const active = type === t;
            return (
              <button key={t} onClick={() => setType(t)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${active ? "border-afb-red bg-afb-red/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-accent/30"}`}>
                <Icon className={`h-5 w-5 mb-2 ${active ? "text-afb-red" : "text-primary"}`} />
                <p className="font-semibold text-sm text-primary">{entityTypeLabels[t]}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{entityTypeDescriptions[t]}</p>
                <p className="text-[10px] mt-2 inline-flex items-center gap-1 text-afb-gold-foreground bg-afb-gold/20 px-1.5 py-0.5 rounded">
                  Validité par défaut : {entityTypeValidityMonths[t]} mois
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Raison sociale">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : SOCAPALM SA" className={inp} />
          </Field>
          <Field label="Nom du contact">
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex : M. Eboa" className={inp} />
          </Field>
          <Field label="Email du destinataire" icon={Mail}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@entreprise.com" className={`${inp} pl-9`} />
          </Field>
        </div>

        {type && (
          <div className="border border-border rounded-lg bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Documents requis · {entityTypeLabels[type]}
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">
              La date de validité de chaque pièce sera demandée lors de son téléversement
              (par défaut : {entityTypeValidityMonths[type]} mois selon la règle {entityTypeLabels[type]}).
            </p>
            <ul className="space-y-2">
              {requiredDocsByType[type].map((d) => (
                <li key={d.key} className="flex items-start gap-2 text-sm flex-wrap">
                  <Circle className={`h-2 w-2 mt-1.5 shrink-0 ${d.mandatory ? "fill-afb-red text-afb-red" : "fill-muted text-muted-foreground"}`} />
                  <span className="flex-1 min-w-0">
                    {d.name}
                    {d.hint && <span className="text-xs text-muted-foreground ml-1">· {d.hint}</span>}
                  </span>
                  <span className={`text-[10px] uppercase font-semibold ${d.mandatory ? "text-afb-red" : "text-muted-foreground"}`}>
                    {d.mandatory ? "Obligatoire" : "Optionnel"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <div className="relative mt-1">
        {Icon && <Icon className="h-4 w-4 absolute left-3 top-[18px] -translate-y-1/2 text-muted-foreground" />}
        {children}
      </div>
    </label>
  );
}
