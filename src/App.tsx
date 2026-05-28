import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FluentProvider } from '@fluentui/react-components';
import { I18nextProvider } from 'react-i18next';

import { afbThemeLight, afbThemeDark } from '@/styles/theme';
import { useThemeStore } from '@/store/themeStore';
import { Layout } from '@/components/layout/Layout';
import { NotificationProvider } from '@/components/common/NotificationProvider';
import Dashboard from '@/pages/Dashboard';
import PartnersList from '@/pages/PartnersList';
import DossiersValidation from '@/pages/DossiersValidation';
import CalendarExpirations from '@/pages/CalendarExpirations';
import UBOPage from '@/pages/UBOPage';
import Screening from '@/pages/Screening';
import Evaluations from '@/pages/Evaluations';
import QuestionnairesList from '@/pages/QuestionnairesList';
import Reports from '@/pages/Reports';
import i18n from '@/i18n/config';
import PartnerTypesAdmin from '@/pages/PartnerTypesAdmin';
import ValidationsDCONF from '@/pages/ValidationsDCONF';
import Users from '@/pages/Users';
import AuditLogs from '@/pages/AuditLogs';
import Configuration from '@/pages/Configuration';

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

export default function App() {
  const theme = useThemeStore(s => s.theme);
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <FluentProvider theme={theme === 'dark' ? afbThemeDark : afbThemeLight}>
          <NotificationProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"      element={<Dashboard />} />
                  <Route path="partners"       element={<PartnersList />} />
                  <Route path="dossiers"       element={<DossiersValidation />} />
                  <Route path="calendar"       element={<CalendarExpirations />} />
                  <Route path="ubo"            element={<UBOPage />} />
                  <Route path="screening"      element={<Screening />} />
                  <Route path="evaluations"    element={<Evaluations />} />
                  <Route path="questionnaires" element={<QuestionnairesList />} />
                  <Route path="reports"        element={<Reports />} />
                  <Route path="validations-dconf" element={<ValidationsDCONF />} />
                  <Route path="users"          element={<Users />} />
                  <Route path="audit-logs"     element={<AuditLogs />} />
                  <Route path="configuration"  element={<Configuration />} />
                  <Route path="admin/partner-types" element={<PartnerTypesAdmin />} />
                </Route>
              </Routes>
            </HashRouter>
          </NotificationProvider>
        </FluentProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}