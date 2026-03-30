import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  VpnKeyOutlined,
  StorefrontOutlined,
} from "@mui/icons-material";
import { tenantsApi, type Tenant } from "../../api/tenants";
import { MpStatusChip } from "../../components/tenant/MpStatusChip";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    tenantsApi
      .show(Number(tenantId))
      .then((res) => setTenant(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !tenant) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Tenant não encontrado.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/")}>
          Voltar
        </Button>
      </Container>
    );
  }

  const mp = tenant.mercadoPago;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back */}
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate("/")}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Meus Tenants
      </Button>

      {/* Header */}
      <Stack direction="row" alignItems="center" gap={2} mb={4}>
        <StorefrontOutlined color="primary" sx={{ fontSize: 36 }} />
        <Box flex={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h5" fontWeight={700}>
              {tenant.name}
            </Typography>
            <Chip
              label={tenant.isActive ? "Ativo" : "Inativo"}
              color={tenant.isActive ? "success" : "default"}
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            /{tenant.slug}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3}>
        {/* Mercado Pago */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                Mercado Pago
              </Typography>
              <MpStatusChip mp={mp ?? { connected: false, tokenValid: false, expiresAt: null }} />
            </Stack>
            <Divider sx={{ mb: 2 }} />

            {!mp ? (
              <Typography variant="body2" color="text.secondary">
                Informações de conexão não disponíveis.
              </Typography>
            ) : mp.connected ? (
              <Stack spacing={1}>
                <InfoRow
                  label="Status"
                  value={mp.tokenValid ? "Ativo e válido" : "Conectado, mas token expirado"}
                />
                {mp.expiresAt && (
                  <InfoRow
                    label="Token expira em"
                    value={new Date(mp.expiresAt).toLocaleString("pt-BR")}
                  />
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma conta do Mercado Pago conectada a este tenant.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* API Key */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <VpnKeyOutlined fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={700}>
                API Key
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {tenant.apiKeyPrefix ? (
              <InfoRow label="Prefixo" value={`${tenant.apiKeyPrefix}...`} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma API Key gerada ainda.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Informações
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              <InfoRow label="ID" value={String(tenant.id)} />
              <InfoRow label="Slug" value={tenant.slug} />
              <InfoRow
                label="Criado em"
                value={new Date(tenant.createdAt).toLocaleString("pt-BR")}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Stack>
  );
}
