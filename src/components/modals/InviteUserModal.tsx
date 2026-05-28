import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { utilisateursInternes } from "@/lib/dataverse/entityHooks";
import {
  DV_ACTIF_OUI,
  DV_DIRECTION_CODE,
  DV_ROLE_CODE,
} from "@/lib/dataverse/userMappers";

const ROLE_OPTIONS: ReadonlyArray<{ label: string; code: number }> = [
  { label: "Chargé de relation", code: DV_ROLE_CODE.ChargeRelation },
  { label: "Chargé de conformité", code: DV_ROLE_CODE.ChargeConformite },
  { label: "Super Admin DCONF", code: DV_ROLE_CODE.SuperadminDCONF },
  { label: "Auditeur interne", code: DV_ROLE_CODE.Auditeurinterne },
  { label: "Auditeur externe", code: DV_ROLE_CODE.Auditeurexterne },
];

const DIRECTION_OPTIONS: ReadonlyArray<{ label: string; code: number }> = [
  { label: "DCONF", code: DV_DIRECTION_CODE.DCONF },
  { label: "DMG", code: DV_DIRECTION_CODE.DMG },
  { label: "DSI", code: DV_DIRECTION_CODE.DSI },
  { label: "TRÉSO", code: DV_DIRECTION_CODE.TRESO },
  { label: "DRISQUE", code: DV_DIRECTION_CODE.DRISQUE },
];

export function InviteUserModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [roleCode, setRoleCode] = useState<number>(ROLE_OPTIONS[0].code);
  const [directionCode, setDirectionCode] = useState<number>(DIRECTION_OPTIONS[0].code);
  const createUser = utilisateursInternes.useCreate();

  const reset = () => {
    setEmail(""); setPrenom(""); setNom("");
    setRoleCode(ROLE_OPTIONS[0].code);
    setDirectionCode(DIRECTION_OPTIONS[0].code);
  };

  const submit = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Email invalide");
    if (!prenom.trim() || !nom.trim()) return toast.error("Prénom et nom requis");

    const nomComplet = `${prenom.trim()} ${nom.trim()}`;
    try {
      const created = await createUser.mutateAsync({
        afb_adresseemail: email.trim(),
        afb_nomcomplet: nomComplet,
        afb_role: roleCode,
        afb_direction: directionCode,
        afb_actif: DV_ACTIF_OUI,
      } as unknown as Parameters<typeof createUser.mutateAsync>[0]);

      const savedRole = created?.afb_rolename ?? "(non enregistré)";
      const savedDirection = created?.afb_directionname ?? "(non enregistrée)";

      toast.success(`Invitation envoyée à ${email.trim()}`, {
        description: `Stocké dans Dataverse — Rôle : ${savedRole} · Direction : ${savedDirection}`,
        duration: 6000,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Création impossible", {
        description: e instanceof Error ? e.message : "Erreur Dataverse.",
      });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Inviter un utilisateur"
      description="L'utilisateur recevra un email d'activation et devra configurer son OTP."
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </PrimaryButton>
          <PrimaryButton variant="red" onClick={submit} disabled={createUser.isPending}>
            <UserPlus className="h-4 w-4" /> {createUser.isPending ? "Envoi…" : "Envoyer l'invitation"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium">Prénom</span>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Armel"
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Nom</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="DAGHA"
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium">Email professionnel</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="prenom.nom@afrilandfirstbank.com"
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium">Rôle</span>
            <select
              value={roleCode}
              onChange={(e) => setRoleCode(Number(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium">Direction</span>
            <select
              value={directionCode}
              onChange={(e) => setDirectionCode(Number(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            >
              {DIRECTION_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </Modal>
  );
}
