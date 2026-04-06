import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Snackbar,
  Alert,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  AssignmentReturnOutlined,
  ContentCopy,
  ReceiptLongOutlined,
  StorefrontOutlined,
  Visibility,
  VisibilityOff,
  VpnKeyOutlined,
} from "@mui/icons-material";
import { tenantsApi, type Tenant } from "../../api/tenants";
import { MpStatusChip } from "../../components/tenant/MpStatusChip";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // MP connect
  const [connecting, setConnecting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // API Key flow
  const [apiKeyWarningOpen, setApiKeyWarningOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);

  const fetchTenant = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    tenantsApi
      .show(Number(tenantId))
      .then((res) => setTenant(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Detecta retorno do MP OAuth
  useEffect(() => {
    if (searchParams.get("mp") === "success") {
      setSearchParams({}, { replace: true });
      fetchTenant();
      setSnackbar({ open: true, message: "Mercado Pago conectado com sucesso!", severity: "success" });
    }
  }, []);

  async function handleConnectMp() {
    if (!tenantId) return;
    setConnecting(true);
    try {
      const res = await tenantsApi.getMpConnectUrl(Number(tenantId));
      window.location.href = res.data.url;
    } catch {
      setConnecting(false);
      setSnackbar({ open: true, message: "Erro ao obter URL de conexão. Tente novamente.", severity: "error" });
    }
  }

  async function handleGenerateApiKey() {
    if (!tenantId) return;
    setApiKeyWarningOpen(false);
    setGeneratingKey(true);
    try {
      const res = await tenantsApi.rotateApiKey(Number(tenantId));
      setGeneratedApiKey(res.data.apiKey);
      setStoredApiKey(res.data.apiKey);
      setTenant((prev) => prev ? { ...prev, apiKeyPrefix: res.data.apiKeyPrefix } : prev);
      setApiKeyDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Erro ao gerar API Key. Tente novamente.", severity: "error" });
    } finally {
      setGeneratingKey(false);
    }
  }

  function handleCopy(value: string) {
    navigator.clipboard.writeText(value);
    setSnackbar({ open: true, message: "Copiado para a área de transferência!", severity: "success" });
  }

  function handleCloseApiKeyDialog() {
    setApiKeyDialogOpen(false);
    setGeneratedApiKey(null);
  }

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
  const mpConnected = mp?.connected && mp?.tokenValid;

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

            {mp?.connected ? (
              <Stack spacing={2}>
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
                {mp.tokenValid && (
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/tenants/${tenantId}/test-payment`)}
                      sx={{ borderColor: "primary.main", color: "primary.main", "&:hover": { bgcolor: "primary.main", color: "#fff" } }}
                    >
                      Pagamento Teste
                    </Button>
                  </Box>
                )}
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma conta do Mercado Pago conectada a este tenant.
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleConnectMp}
                    disabled={connecting}
                    startIcon={connecting ? <CircularProgress size={16} /> : null}
                    sx={{
                      borderColor: "primary.main",
                      color: "primary.main",
                      "&:hover": {
                        bgcolor: "primary.main",
                        color: "#fff",
                      },
                    }}
                  >
                    {connecting ? "Redirecionando..." : "Conectar Mercado Pago"}
                  </Button>
                </Box>
              </Stack>
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

            {!mpConnected ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Geração da API Key disponível após a conexão com o Mercado Pago.
              </Typography>
            ) : tenant.apiKeyPrefix ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Sua API Key atual (gerada anteriormente):
                </Typography>
                <Stack direction="row" alignItems="center" gap={1}>
                  <OutlinedInput
                    size="small"
                    fullWidth
                    readOnly
                    type={revealKey ? "text" : "password"}
                    value={storedApiKey ?? `${tenant.apiKeyPrefix}${"x".repeat(24)}`}
                    sx={{ fontFamily: "monospace", fontSize: 13 }}
                    endAdornment={
                      <InputAdornment position="end">
                        <Stack direction="row">
                          {storedApiKey && (
                            <Tooltip title="Copiar">
                              <IconButton size="small" onClick={() => handleCopy(storedApiKey)}>
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={revealKey ? "Ocultar" : "Revelar"}>
                            <IconButton size="small" onClick={() => setRevealKey((v) => !v)}>
                              {revealKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </InputAdornment>
                    }
                  />
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={generatingKey}
                  startIcon={generatingKey ? <CircularProgress size={14} /> : null}
                  onClick={() => setApiKeyWarningOpen(true)}
                  sx={{
                    mt: 1,
                    alignSelf: "flex-start",
                    borderColor: "primary.main",
                    color: "primary.main",
                    "&:hover": { bgcolor: "primary.main", color: "#fff" },
                  }}
                >
                  Rotacionar API Key
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma API Key gerada ainda.
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    disabled={generatingKey}
                    startIcon={generatingKey ? <CircularProgress size={16} /> : null}
                    onClick={() => setApiKeyWarningOpen(true)}
                    sx={{
                      borderColor: "primary.main",
                      color: "primary.main",
                      "&:hover": { bgcolor: "primary.main", color: "#fff" },
                    }}
                  >
                    Gerar API Key
                  </Button>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <ReceiptLongOutlined fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={700}>
                Pagamentos
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" mb={2}>
              Visualize todos os pagamentos processados por este tenant.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/tenants/${tenantId}/payments`)}
              sx={{ borderColor: "primary.main", color: "primary.main", "&:hover": { bgcolor: "primary.main", color: "#fff" } }}
            >
              Ver Pagamentos
            </Button>
          </CardContent>
        </Card>

        {/* Reembolsos */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <AssignmentReturnOutlined fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={700}>
                Reembolsos
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" mb={2}>
              Visualize os reembolsos relacionados ao seu negócio.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/tenants/${tenantId}/refunds`)}
              sx={{ borderColor: "primary.main", color: "primary.main", "&:hover": { bgcolor: "primary.main", color: "#fff" } }}
            >
              Ver Reembolsos
            </Button>
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

      {/* Dialog: aviso antes de gerar API Key */}
      <Dialog open={apiKeyWarningOpen} onClose={() => setApiKeyWarningOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Atenção</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A API Key é uma credencial secreta e deve ser protegida como uma senha pessoal.
            <br /><br />
            Nunca a compartilhe publicamente ou inclua em repositórios de código.
            Ela será exibida <strong>apenas uma vez</strong> após a geração.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApiKeyWarningOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleGenerateApiKey}>
            Entendido, gerar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: exibe a API Key gerada */}
      <Dialog open={apiKeyDialogOpen} onClose={handleCloseApiKeyDialog} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Sua API Key</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Copie e guarde sua API Key agora. Ela <strong>não será exibida novamente</strong> após fechar esta janela.
          </DialogContentText>
          <OutlinedInput
            fullWidth
            readOnly
            value={generatedApiKey ?? ""}
            sx={{ fontFamily: "monospace", fontSize: 13, bgcolor: "#F8FAFC" }}
            endAdornment={
              <InputAdornment position="end">
                <Tooltip title="Copiar">
                  <IconButton onClick={() => generatedApiKey && handleCopy(generatedApiKey)}>
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            }
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta chave não será exibida novamente. Guarde-a em local seguro.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={handleCloseApiKeyDialog}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar global */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
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
