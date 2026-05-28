import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function ScreeningModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [lists, setLists] = useState({ ofac: true, eu: true, un: true, pep: true, media: false });
  const submit = () => {
    if (!q) return toast.error("Renseignez un nom à screener");
    const active = Object.entries(lists).filter(([_, v]) => v).length;
    toast.success(`Screening lancé pour "${q}"`, {
      description: `${active} listes interrogées · résultats sous 30 sec.`,
    });
    onOpenChange(false);
    setQ("");
  };
  const Toggle = ({ k, l }: { k: keyof typeof lists; l: string }) => (
    <label className="flex items-center justify-between p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/30">
      <span className="text-sm">{l}</span>
      <input
        type="checkbox"
        checked={lists[k]}
        onChange={(e) => setLists({ ...lists, [k]: e.target.checked })}
        className="h-4 w-4 accent-[var(--afb-red)]"
      />
    </label>
  );
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Lancer un screening"
      description="Vérification contre listes de sanctions internationales et bases PPE."
      size="lg"
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>Annuler</PrimaryButton>
          <PrimaryButton variant="red" onClick={submit}>
            <Search className="h-4 w-4" /> Lancer
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium">Nom de la personne ou entité</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ex : Robert Tchoungui"
            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
          />
        </label>
        <div>
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Listes à interroger
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Toggle k="ofac" l="OFAC SDN List (US)" />
            <Toggle k="eu" l="EU Sanctions List" />
            <Toggle k="un" l="UN Consolidated List" />
            <Toggle k="pep" l="PEP Database" />
            <Toggle k="media" l="Adverse Media" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
