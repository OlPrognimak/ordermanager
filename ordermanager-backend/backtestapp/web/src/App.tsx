import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ENABLE_STRATEGIES_PAGE, ENABLE_USER_MANUAL_PAGE } from "@/constants/navAvailability";
import { JobsProvider } from "@/context/JobsContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import ConfigurePage from "@/pages/ConfigurePage";
import DashboardPage from "@/pages/DashboardPage";
import DataAnalysisHubPage from "@/pages/DataAnalysisHubPage";
import DataAnalysisPage from "@/pages/DataAnalysisPage";
import JobDetailPage from "@/pages/JobDetailPage";
import Layout from "@/pages/Layout";
import StrategiesPage from "@/pages/StrategiesPage";
import UserManualPage from "@/pages/UserManualPage";
import { theme } from "@/theme";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <JobsProvider>
          <PreferencesProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="configure" element={<ConfigurePage />} />
                <Route path="analysis" element={<DataAnalysisHubPage />} />
                <Route
                  path="strategies"
                  element={
                    ENABLE_STRATEGIES_PAGE ? <StrategiesPage /> : <Navigate to="/" replace />
                  }
                />
                <Route
                  path="manual"
                  element={
                    ENABLE_USER_MANUAL_PAGE ? <UserManualPage /> : <Navigate to="/" replace />
                  }
                />
                <Route path="jobs/:jobId/analysis" element={<DataAnalysisPage />} />
                <Route path="jobs/:jobId" element={<JobDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </PreferencesProvider>
        </JobsProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
