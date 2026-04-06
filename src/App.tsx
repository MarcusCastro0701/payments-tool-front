import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { AuthPage } from "./pages/auth/AuthPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { TenantDetailPage } from "./pages/tenant/TenantDetailPage";
import { TestPaymentPage } from "./pages/tenant/TestPaymentPage";
import { PaymentsListPage } from "./pages/tenant/PaymentsListPage";
import { RefundsPage } from "./pages/tenant/RefundsPage";
import { RefundDetailPage } from "./pages/tenant/RefundDetailPage";
import { PaymentDetailPage } from "./pages/tenant/PaymentDetailPage";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563EB",
    },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
              <Route path="/tenants/:tenantId/test-payment" element={<TestPaymentPage />} />
              <Route path="/tenants/:tenantId/payments" element={<PaymentsListPage />} />
              <Route path="/tenants/:tenantId/payments/:paymentId" element={<PaymentDetailPage />} />
              <Route path="/tenants/:tenantId/refunds" element={<RefundsPage />} />
              <Route path="/tenants/:tenantId/refunds/:paymentId/:refundId" element={<RefundDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
