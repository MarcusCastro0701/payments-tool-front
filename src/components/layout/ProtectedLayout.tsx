import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Header } from "./Header";

export function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <Header />
      <Box component="main" sx={{ pt: "64px", minHeight: "100vh", bgcolor: "background.default" }}>
        <Outlet />
      </Box>
    </>
  );
}
