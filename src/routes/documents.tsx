import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, StatusBadge, PrimaryButton } from "@/components/ui-kit";
import { FileText, UploadCloud } from "lucide-react";
import { UploadDocModal } from "@/components/modals/UploadDocModal";
import { Modal } from "@/components/Modal";
import { requiredDocsByType } from "@/lib/entity-types";

export const Route = createFileRoute("/documents")({ component: Documents });

const docs = [
  { n: "Registre du commerce", s: "Validé" as const, d: "12/04/2025" },
  { n: "Statuts de la société", s: "Validé" as const, d: "12/04/2025" },
  { n: "Attestation fiscale", s: "En revue" as const, d: "20/04/2025" },
  { n: "Pièce d'identité dirigeant", s: "Validé" as const, d: "12/04/2025" },
  { n: "Déclaration UBO signée", s: "Brouillon" as const, d: "—" },
];

function Documents() {
  const [up, setUp] = useState(false);
  const [view, setView] = useState<typeof docs[number] | null>(null);
  // Default partner = "partenaire" requirements
  const required = requiredDocsByType.partenaire.map((d) => ({ key: d.key, name: d.name }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Mes documents"
        subtitle="Coffre-fort sécurisé · chiffrement AES-256"
        actions={
          <PrimaryButton variant="red" onClick={() => setUp(true)}>
            <UploadCloud className="h-4 w-4" />Téléverser
          </PrimaryButton>
        }
      />
      <Card>
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.n} className="py-3 flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.n}</p>
                <p className="text-xs text-muted-foreground">Mis à jour : {d.d}</p>
              </div>
              <StatusBadge status={d.s} />
              <button onClick={() => setView(d)} className="text-xs text-primary hover:underline">Voir</button>
            </li>
          ))}
        </ul>
      </Card>

      <UploadDocModal open={up} onOpenChange={setUp} documents={required} entityType="partenaire" />
      <Modal
        open={!!view}
        onOpenChange={(o) => !o && setView(null)}
        title={view?.n ?? ""}
        description={`Mis à jour : ${view?.d}`}
        size="lg"
        footer={
          <PrimaryButton variant="outline" onClick={() => setView(null)}>Fermer</PrimaryButton>
        }
      >
        <div className="aspect-[3/2] rounded-md border border-border bg-muted/40 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aperçu sécurisé du document</p>
            <p className="text-xs text-muted-foreground mt-1">Chiffré AES-256 · accès auditable</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
