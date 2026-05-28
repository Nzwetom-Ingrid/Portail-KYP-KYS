import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

type RiskLevel = "low" | "medium" | "high";
export function RiskBadge({ level }: { level: RiskLevel }) {
  const map = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/15 text-[oklch(0.45_0.12_70)] border-warning/30",
    high: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const label = { low: "Low", medium: "Medium", high: "High" }[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${map[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: "Validé" | "En revue" | "Rejeté" | "Brouillon" | "Expiré";
}) {
  const map: Record<string, string> = {
    Validé: "bg-success/10 text-success",
    "En revue": "bg-info/10 text-info",
    Rejeté: "bg-destructive/10 text-destructive",
    Brouillon: "bg-muted text-muted-foreground",
    Expiré: "bg-warning/15 text-[oklch(0.45_0.13_65)]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${map[status]}`}>{status}</span>
  );
}

export function PrimaryButton({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "red" | "outline" | "ghost";
}) {
  const styles = {
    primary:
      "bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-95 shadow-sm",
    red: "bg-afb-red text-afb-red-foreground hover:brightness-110 shadow-sm",
    outline: "border border-border bg-card hover:bg-accent text-foreground",
    ghost: "hover:bg-accent text-foreground",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
