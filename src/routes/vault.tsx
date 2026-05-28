import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader } from "@/components/ui-kit";
import { Lock, ShieldCheck, Key } from "lucide-react";

export const Route = createFileRoute("/vault")({ component: Vault });

function Vault() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <PageHeader title="Coffre-fort numérique" subtitle="Vos documents sont chiffrés et auditables" />
      <Card className="bg-[image:var(--gradient-primary)] text-primary-foreground border-0">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-afb-gold" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-widest text-white/70">Chiffrement</p>
            <p className="text-2xl font-bold">AES-256 · TLS 1.3</p>
            <p className="text-xs text-white/70 mt-1">Conforme COBAC R-2023/01 · Hébergement souverain</p>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { i: ShieldCheck, l: "Double authentification", v: "OTP active" },
          { i: Key, l: "Clés de chiffrement", v: "Rotation 90j" },
          { i: Lock, l: "Documents archivés", v: "12 fichiers" },
        ].map((s) => (
          <Card key={s.l}>
            <s.i className="h-5 w-5 text-primary mb-3" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="text-lg font-semibold text-primary mt-1">{s.v}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
