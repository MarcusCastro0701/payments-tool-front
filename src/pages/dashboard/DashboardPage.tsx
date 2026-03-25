import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { Add, StorefrontOutlined } from "@mui/icons-material";
import { tenantsApi, type Tenant } from "../../api/tenants";
import axios from "axios";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    tenantsApi
      .list()
      .then((res) => setTenants(res.data))
      .finally(() => setLoading(false));
  }, []);

  function handleNameChange(val: string) {
    setNewName(val);
    if (!slugManual) setNewSlug(generateSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlugManual(true);
    setNewSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80));
  }

  function handleOpenCreate() {
    setNewName("");
    setNewSlug("");
    setSlugManual(false);
    setCreateError(null);
    setOpenCreate(true);
  }

  async function handleCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      const res = await tenantsApi.create({ name: newName, slug: newSlug });
      setTenants((prev) => [res.data, ...prev]);
      setOpenCreate(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setCreateError(err.response?.data?.message ?? "Erro ao criar tenant");
      } else {
        setCreateError("Erro inesperado");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page header */}
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
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Novo Tenant
        </Button>
      </Stack>

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : tenants.length === 0 ? (
        <EmptyState onNew={handleOpenCreate} />
      ) : (
        <Grid container spacing={2}>
          {tenants.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TenantCard tenant={t} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create tenant dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo Tenant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Nome da conta"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              fullWidth
              autoFocus
              inputProps={{ minLength: 2, maxLength: 120 }}
            />
            <TextField
              label="Slug"
              value={newSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              fullWidth
              inputProps={{ minLength: 2, maxLength: 80 }}
              helperText="Somente letras minúsculas, números e hífens"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newName || !newSlug}
            loading={creating}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function TenantCard({ tenant }: { tenant: Tenant }) {
  const mpStatus = tenant.mercadoPago;

  return (
    <Card sx={{ borderRadius: 2, height: "100%" }} variant="outlined">
      <CardActionArea sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <StorefrontOutlined color="primary" />
            <Chip
              label={tenant.isActive ? "Ativo" : "Inativo"}
              color={tenant.isActive ? "success" : "default"}
              size="small"
            />
          </Stack>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {tenant.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            /{tenant.slug}
          </Typography>

          {mpStatus && (
            <Chip
              label={
                mpStatus.connected && mpStatus.tokenValid
                  ? "MP Conectado"
                  : mpStatus.connected
                  ? "MP — Token expirado"
                  : "MP não conectado"
              }
              color={
                mpStatus.connected && mpStatus.tokenValid
                  ? "success"
                  : mpStatus.connected
                  ? "warning"
                  : "default"
              }
              size="small"
              variant="outlined"
            />
          )}

          {tenant.apiKeyPrefix && (
            <Typography variant="caption" color="text.disabled" display="block" mt={1}>
              API Key: {tenant.apiKeyPrefix}...
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={10}
      gap={2}
    >
      <StorefrontOutlined sx={{ fontSize: 64, color: "text.disabled" }} />
      <Typography variant="h6" color="text.secondary" fontWeight={600}>
        Você ainda não tem nenhum tenant
      </Typography>
      <Typography variant="body2" color="text.disabled">
        Crie um tenant para começar a usar a plataforma
      </Typography>
      <Button variant="contained" startIcon={<Add />} onClick={onNew} sx={{ mt: 1, borderRadius: 2 }}>
        Criar primeiro tenant
      </Button>
    </Box>
  );
}
