import { createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { RoleProvider } from "@/lib/role-context";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas dans le portail KYP/KYS.
        </p>
        <Link to="/" className="inline-flex items-center justify-center mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Portail KYP / KYS · Afriland First Bank" },
      { name: "description", content: "Portail Digital KYP & KYS — Afriland First Bank." },
      { property: "og:title", content: "Portail KYP / KYS · Afriland First Bank" },
      { name: "twitter:title", content: "Portail KYP / KYS · Afriland First Bank" },
      { property: "og:description", content: "Portail Digital KYP & KYS — Afriland First Bank." },
      { name: "twitter:description", content: "Portail Digital KYP & KYS — Afriland First Bank." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ab8ab5e1-35b0-43c5-889d-880d7335dd4e/id-preview-86026e4e--f314185c-2862-4b54-b441-15f3282d0c4b.lovable.app-1778234896348.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ab8ab5e1-35b0-43c5-889d-880d7335dd4e/id-preview-86026e4e--f314185c-2862-4b54-b441-15f3282d0c4b.lovable.app-1778234896348.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <RoleProvider>
      <AppShell />
      <Toaster position="top-right" richColors />
    </RoleProvider>
  );
}
