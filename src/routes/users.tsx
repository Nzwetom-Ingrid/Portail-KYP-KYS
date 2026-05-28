import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, PrimaryButton } from "@/components/ui-kit";
import { UserPlus, Shield } from "lucide-react";
import { InviteUserModal } from "@/components/modals/InviteUserModal";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

const users = [
  { n: "Joséphine Mbarga", r: "Super Admin", d: "DCONF", e: "j.mbarga@afrilandfirstbank.com", s: true },
  { n: "Marc Eboa", r: "Admin Conformité", d: "DCONF", e: "m.eboa@afrilandfirstbank.com", s: true },
  { n: "Sandrine Nkoa", r: "Admin Conformité", d: "DMG", e: "s.nkoa@afrilandfirstbank.com", s: true },
  { n: "Alain Tchami", r: "Analyste", d: "Trésorerie", e: "a.tchami@afrilandfirstbank.com", s: true },
  { n: "Patrick Owono", r: "Analyste", d: "DSI", e: "p.owono@afrilandfirstbank.com", s: false },
];

function UsersPage() {
  const [invite, setInvite] = useState(false);
  const [edit, setEdit] = useState<typeof users[number] | null>(null);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Gestion des utilisateurs"
        subtitle="Rôles, permissions (RBAC) et authentification forte (OTP)"
        actions={<PrimaryButton variant="red" onClick={() => setInvite(true)}><UserPlus className="h-4 w-4" />Inviter un utilisateur</PrimaryButton>}
      />
      <Card>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 font-medium">Direction</th>
                <th className="text-left px-4 py-3 font-medium">OTP</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.e} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {u.n.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div>
                        <p className="font-medium">{u.n}</p>
                        <p className="text-xs text-muted-foreground">{u.e}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${u.r.includes("Super") ? "bg-afb-red/10 text-afb-red" : "bg-primary/10 text-primary"}`}>
                      {u.r}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.d}</td>
                  <td className="px-4 py-3">
                    {u.s ? (
                      <span className="text-xs flex items-center gap-1 text-success font-medium">
                        <Shield className="h-3 w-3" /> Activé
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEdit(u)} className="text-xs text-primary hover:underline">Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <InviteUserModal open={invite} onOpenChange={setInvite} />
      <Modal
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        title={`Modifier · ${edit?.n ?? ""}`}
        description={edit?.e}
        footer={
          <>
            <PrimaryButton variant="outline" onClick={() => setEdit(null)}>Annuler</PrimaryButton>
            <PrimaryButton variant="red" onClick={() => { toast.success("Utilisateur mis à jour"); setEdit(null); }}>Enregistrer</PrimaryButton>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium">Rôle</span>
            <select defaultValue={edit?.r} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-card text-sm">
              <option>Analyste</option>
              <option>Admin Conformité</option>
              <option>Super Admin</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={edit?.s} className="h-4 w-4 accent-[var(--afb-red)]" />
            Authentification OTP active
          </label>
        </div>
      </Modal>
    </div>
  );
}
