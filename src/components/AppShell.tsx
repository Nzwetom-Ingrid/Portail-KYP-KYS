import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useRole, roleLabels, directionLabels, type Role, type Direction } from "@/lib/role-context";
import logo from "@/assets/afriland-logo.jpg";
import {
  LayoutDashboard, Users, FileCheck2, ShieldAlert, Database, Settings,
  Bell, Search, ChevronDown, ShieldCheck, FileText, UploadCloud, Lock,
  Menu, X, Calendar, ClipboardCheck, Star, ClipboardList,
} from "lucide-react";
import { useState } from "react";

const navByRole: Record<Role, { to: string; label: string; icon: any }[]> = {
  "super-admin": [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/dossiers", label: "Dossiers", icon: FileCheck2 },
    { to: "/validations", label: "Validations DCONF", icon: ClipboardCheck },
    { to: "/calendar", label: "Calendrier expirations", icon: Calendar },
    { to: "/dataverse", label: "Dataverse UBO", icon: Database },
    { to: "/questionnaires", label: "Questionnaires", icon: ClipboardList },
    { to: "/screening", label: "Screening PPE", icon: ShieldAlert },
    { to: "/evaluations", label: "Évaluations", icon: Star },
    { to: "/users", label: "Utilisateurs", icon: Users },
    { to: "/audit", label: "Logs d'audit", icon: ShieldCheck },
    { to: "/settings", label: "Configuration", icon: Settings },
  ],
  "admin-direction": [
    { to: "/", label: "Dashboard direction", icon: LayoutDashboard },
    { to: "/dossiers", label: "Dossiers (ma direction)", icon: FileCheck2 },
    { to: "/calendar", label: "Calendrier expirations", icon: Calendar },
    { to: "/users", label: "Utilisateurs direction", icon: Users },
    { to: "/audit", label: "Audit direction", icon: ShieldCheck },
  ],
  admin: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/dossiers", label: "Validation dossiers", icon: FileCheck2 },
    { to: "/calendar", label: "Calendrier expirations", icon: Calendar },
    { to: "/dataverse", label: "Bénéficiaires UBO", icon: Database },
    { to: "/screening", label: "Screening PPE", icon: ShieldAlert },
    { to: "/evaluations", label: "Évaluations prestataire", icon: Star },
    { to: "/questionnaires", label: "Questionnaires", icon: ClipboardList },
    { to: "/reports", label: "Rapports PDF", icon: FileText },
  ],
  partner: [
    { to: "/", label: "Mon espace", icon: LayoutDashboard },
    { to: "/onboarding", label: "Onboarding KYP/KYS", icon: UploadCloud },
    { to: "/my-questionnaires", label: "Mes questionnaires", icon: ClipboardList },
    { to: "/documents", label: "Mes documents", icon: FileText },
    { to: "/vault", label: "Coffre-fort", icon: Lock },
  ],
};

export function AppShell() {
  const { role, setRole, direction, setDirection, user } = useRole();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navByRole[role];
  const displayName = user?.name ?? "J. Mbarga";
  const initials = displayName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const SidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="bg-white rounded-md p-2 flex items-center justify-center">
          <img src={logo} alt="Afriland First Bank" className="h-8 object-contain" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-afb-red">KYP / KYS · Connect</p>
        {role !== "partner" && (
          <p className="mt-1 text-[11px] text-afb-gold">Direction · {direction}</p>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active ? "bg-afb-red/15 text-white font-semibold border-l-2 border-afb-red shadow-[inset_0_0_0_1px_oklch(0.577_0.233_27_/_0.25)]"
                       : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}>
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-afb-gold" /> COBAC R-2023/01
        </div>
        <p className="mt-1">RBAC Dataverse · RLS</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-md hover:bg-white/10 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-3 sm:px-6 gap-2 sm:gap-4">
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Rechercher…"
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="flex-1 sm:hidden" />
          <button className="relative h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center">
            <Bell className="h-4 w-4 text-foreground" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-afb-red" />
          </button>
          <div className="relative">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-2 h-9 px-2 sm:px-3 rounded-md border border-border hover:bg-accent text-sm">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center text-xs font-semibold">
                {initials}
              </span>
              <span className="text-left hidden sm:block">
                <span className="block font-medium leading-tight">{displayName}</span>
                <span className="block text-[10px] text-muted-foreground leading-tight">{roleLabels[role]}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover shadow-[var(--shadow-elevated)] p-2 z-50">
                <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Changer de rôle (démo)</p>
                {(Object.keys(roleLabels) as Role[]).map((r) => (
                  <button key={r} onClick={() => { setRole(r); setOpen(false); }}
                    className={`w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between ${role === r ? "bg-accent font-medium" : ""}`}>
                    {roleLabels[r]}
                    {role === r && <span className="h-2 w-2 rounded-full bg-afb-red" />}
                  </button>
                ))}
                {role !== "super-admin" && role !== "partner" && (
                  <>
                    <p className="mt-2 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border pt-2">Direction</p>
                    {(Object.keys(directionLabels) as Direction[]).map((d) => (
                      <button key={d} onClick={() => { setDirection(d); setOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent flex items-center justify-between ${direction === d ? "bg-accent font-medium" : ""}`}>
                        {directionLabels[d]}
                        {direction === d && <span className="h-1.5 w-1.5 rounded-full bg-afb-gold" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
