import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader } from "@/components/ui-kit";
import { CheckCircle2, AlertCircle, LogIn, FileEdit } from "lucide-react";

export const Route = createFileRoute("/audit")({ component: Audit });

const logs = [
  { t: "10:42", u: "M. Eboa", a: "Validation dossier", d: "KYP-2025-0142 — SOCAPALM SA", i: CheckCircle2, c: "text-success" },
  { t: "10:31", u: "S. Nkoa", a: "Modification UBO", d: "Global Trade Cameroun — ajout bénéficiaire", i: FileEdit, c: "text-primary" },
  { t: "09:58", u: "J. Mbarga", a: "Connexion OTP", d: "IP 196.207.xxx — Yaoundé", i: LogIn, c: "text-muted-foreground" },
  { t: "09:42", u: "Système", a: "Alerte SLA", d: "3 dossiers expirent sous 7 jours", i: AlertCircle, c: "text-afb-red" },
  { t: "09:15", u: "M. Eboa", a: "Rejet dossier", d: "KYS-2025-0251 — AgroNord SARL", i: AlertCircle, c: "text-afb-red" },
];

function Audit() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Logs d'audit" subtitle="Traçabilité complète des actions — conformité réglementaire" />
      <Card>
        <ul className="divide-y divide-border">
          {logs.map((l, i) => (
            <li key={i} className="py-3 flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-12">{l.t}</span>
              <l.i className={`h-4 w-4 ${l.c}`} />
              <div className="flex-1">
                <p className="text-sm"><strong>{l.u}</strong> — {l.a}</p>
                <p className="text-xs text-muted-foreground">{l.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
