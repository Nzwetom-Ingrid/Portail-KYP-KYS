import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FluentProvider } from '@fluentui/react-components';
import { I18nextProvider } from 'react-i18next';

import { afbThemeLight, afbThemeDark } from '@/styles/theme';
import { useThemeStore } from '@/store/themeStore';
import { useRoleStore } from '@/store/roleStore';
import type { Permission } from '@/types/roles';
import { Layout } from '@/components/layout/Layout';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import { IdleLock } from '@/components/common/IdleLock';
import Dashboard from '@/pages/Dashboard';
import DossiersValidation from '@/pages/DossiersValidation';
import CalendarExpirations from '@/pages/CalendarExpirations';
import UBOPage from '@/pages/UBOPage';
import Screening from '@/pages/Screening';
import Evaluations from '@/pages/Evaluations';
import QuestionnairesList from '@/pages/QuestionnairesList';
import Reports from '@/pages/Reports';
import DocumentShare from '@/pages/DocumentShare';
import MesDossiers from '@/pages/MesDossiers';
import i18n from '@/i18n/config';
import PartnerTypesAdmin from '@/pages/PartnerTypesAdmin';
import ValidationsDCONF from '@/pages/ValidationsDCONF';
import Users from '@/pages/Users';
import AuditLogs from '@/pages/AuditLogs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Garde d'accès par permission : redirige vers le Dashboard si le rôle ne l'a pas. */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const can = useRoleStore(s => s.can);
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Accueil selon le rôle : le chargé de relation atterrit sur « Mes dossiers »,
 *  les autres sur le Dashboard. On attend la résolution du rôle réel pour ne pas
 *  partir prématurément sur le Dashboard. */
function RoleHome() {
  const roleResolved = useRoleStore(s => s.roleResolved);
  const roleId = useRoleStore(s => s.currentRole.id);
  if (!roleResolved) return null;
  const home = roleId === 'charge-kyc' ? '/mes-dossiers' : '/dashboard';
  return <Navigate to={home} replace />;
}

/** Garde par direction interne (ex. Documents partagés = DCONF/DMG). */
function RequireDirection({ directions, children }: { directions: string[]; children: ReactNode }) {
  const identity = useRoleStore(s => s.identity);
  const currentRole = useRoleStore(s => s.currentRole);
  const dir = identity.direction ?? currentRole.direction;
  if (!dir || !directions.includes(dir)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Garde par rôle applicatif (ex. Mes dossiers = chargé de relation ; les admins
 *  peuvent aussi y accéder pour inspection). */
function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const roleId = useRoleStore(s => s.currentRole.id);
  const can = useRoleStore(s => s.can);
  if (!roles.includes(roleId) && !can('admin.full')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const theme = useThemeStore(s => s.theme);
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <FluentProvider theme={theme === 'dark' ? afbThemeDark : afbThemeLight}>
          <NotificationProvider>
            <IdleLock />
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<RoleHome />} />
                  <Route path="dashboard"      element={<Dashboard />} />
                  <Route path="dossiers"       element={<RequirePermission permission="dossiers.validate"><DossiersValidation /></RequirePermission>} />
                  <Route path="validations-dconf" element={<RequirePermission permission="dossiers.confirm"><ValidationsDCONF /></RequirePermission>} />
                  <Route path="calendar"       element={<CalendarExpirations />} />
                  <Route path="ubo"            element={<RequirePermission permission="ubo.view"><UBOPage /></RequirePermission>} />
                  <Route path="screening"      element={<RequirePermission permission="screening.view"><Screening /></RequirePermission>} />
                  <Route path="evaluations"    element={<RequirePermission permission="questionnaires.view"><Evaluations /></RequirePermission>} />
                  <Route path="questionnaires" element={<RequirePermission permission="questionnaires.view"><QuestionnairesList /></RequirePermission>} />
                  <Route path="reports"        element={<RequirePermission permission="reports.export"><Reports /></RequirePermission>} />
                  <Route path="document-share" element={<RequireDirection directions={['DCONF', 'DMG']}><DocumentShare /></RequireDirection>} />
                  <Route path="mes-dossiers"   element={<RequireRole roles={['charge-kyc']}><MesDossiers /></RequireRole>} />
                  <Route path="users"          element={<RequirePermission permission="users.manage"><Users /></RequirePermission>} />
                  <Route path="audit-logs"     element={<RequirePermission permission="admin.full"><AuditLogs /></RequirePermission>} />
                  <Route path="admin/partner-types" element={<RequirePermission permission="admin.full"><PartnerTypesAdmin /></RequirePermission>} />
                </Route>
              </Routes>
            </HashRouter>
          </NotificationProvider>
        </FluentProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}