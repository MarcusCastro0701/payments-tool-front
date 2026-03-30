import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Container, Grid, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { tenantsApi, type Tenant } from "../../api/tenants";
import { TenantCard } from "../../components/tenant/TenantCard";
import { EmptyState } from "../../components/tenant/EmptyState";
import { CreateTenantDialog } from "../../components/tenant/CreateTenantDialog";

export function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    tenantsApi
      .list()
      .then((res) => setTenants(res.data))
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(tenant: Tenant) {
    setTenants((prev) => [tenant, ...prev]);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Meus Tenants
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie suas contas e integrações de pagamento
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreate(true)}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Novo Tenant
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : tenants.length === 0 ? (
        <EmptyState onNew={() => setOpenCreate(true)} />
      ) : (
        <Grid container spacing={2}>
          {tenants.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TenantCard tenant={t} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateTenantDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={handleCreated}
      />
    </Container>
  );
}
