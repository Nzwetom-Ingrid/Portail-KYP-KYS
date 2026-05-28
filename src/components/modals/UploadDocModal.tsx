import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { PrimaryButton } from "@/components/ui-kit";
import { UploadCloud, FileText, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  entityTypeLabels, entityTypeValidityMonths,
  computeValidityDate, formatDate,
  type EntityType,
} from "@/lib/entity-types";

export function UploadDocModal({
  open,
  onOpenChange,
  documents,
  entityType,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documents?: { key: string; name: string }[];
  /**
   * Cible du dossier — détermine la durée de validité par défaut du document.
   * (correspondant 12 mois · partenaire 24 mois · fournisseur 36 mois)
   */
  entityType?: EntityType;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [docKey, setDocKey] = useState("");
  const [issuedAt, setIssuedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [validity, setValidity] = useState<string>("");

  // Recalcule la date par défaut quand la cible ou la date d'émission change
  useEffect(() => {
    if (!entityType) return;
    const base = issuedAt ? new Date(issuedAt) : new Date();
    setValidity(computeValidityDate(entityType, base).toISOString().slice(0, 10));
  }, [entityType, issuedAt]);

  const defaultValidity = entityType
    ? formatDate(computeValidityDate(entityType, issuedAt ? new Date(issuedAt) : new Date()))
    : null;

  const submit = () => {
    if (!file) return toast.error("Sélectionnez un fichier");
    if (!validity) return toast.error("Date de validité du document requise");
    toast.success(`${file.name} téléversé avec succès`, {
      description: `Validité jusqu'au ${formatDate(new Date(validity))} · chiffrement AES-256`,
    });
    setFile(null);
    setDocKey("");
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Téléverser un document"
      description="PDF, JPG ou PNG — 10 Mo maximum. Chiffrement AES-256."
      footer={
        <>
          <PrimaryButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </PrimaryButton>
          <PrimaryButton variant="red" onClick={submit}>
            <UploadCloud className="h-4 w-4" /> Téléverser
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {documents && documents.length > 0 && (
          <label className="block">
            <span className="text-xs font-medium">Type de document</span>
            <select
              value={docKey}
              onChange={(e) => setDocKey(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm"
            >
              <option value="">— Sélectionner —</option>
              {documents.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium">Date d'émission</span>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-afb-red" /> Date de validité
            </span>
            <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm" />
            {entityType && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Par défaut {entityTypeValidityMonths[entityType]} mois — règle {entityTypeLabels[entityType]} (échéance {defaultValidity}).
              </p>
            )}
          </label>
        </div>

        <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 hover:bg-accent/20 cursor-pointer transition-colors">
          <UploadCloud className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-sm font-medium break-words">
            {file ? file.name : "Cliquez pour choisir un fichier"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">ou glissez-déposez ici</p>
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 text-sm min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
