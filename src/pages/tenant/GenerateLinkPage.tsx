import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  CheckCircle,
  ContentCopy,
  Launch,
  LinkOutlined,
  WhatsApp,
} from "@mui/icons-material";
import { tenantsApi, type Tenant } from "../../api/tenants";

export function GenerateLinkPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Formulário
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");

  // Erros de validação
  const [amountError, setAmountError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  // Estado de geração
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  const fetchTenant = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    tenantsApi
      .show(Number(tenantId))
      .then((res) => setTenant(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  function validate(): boolean {
    let valid = true;
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Informe um valor válido maior que zero.");
      valid = false;
    } else {
      setAmountError("");
    }
    if (!description.trim()) {
      setDescriptionError("A descrição é obrigatória.");
      valid = false;
    } else {
      setDescriptionError("");
    }
    return valid;
  }

  async function handleGenerate() {
    if (!tenantId || !validate()) return;
    setGenerating(true);
    setGenerateError(null);
    setGeneratedLink(null);
    try {
      const parsedAmount = parseFloat(amount.replace(",", "."));
      const res = await tenantsApi.createPreference(Number(tenantId), {
        amount: parsedAmount,
        title: description.trim(),
        description: description.trim(),
        category: "services",
        ...(payerEmail.trim() ? { payerEmail: payerEmail.trim() } : {}),
        ...(payerName.trim() ? { payerName: payerName.trim() } : {}),
      });
      if (!res.data.initPoint) {
        setGenerateError("Mercado Pago não retornou o link. Tente novamente.");
        return;
      }
      setGeneratedLink(res.data.initPoint);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erro ao gerar link. Verifique se o token MP está válido.";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setSnackbar({ open: true, message: "Link copiado!" });
  }

  function handleWhatsApp() {
    if (!generatedLink) return;
    const msg = encodeURIComponent(`Olá! Segue o link para realizar o pagamento:\n${generatedLink}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  function handleNewLink() {
    setGeneratedLink(null);
    setGenerateError(null);
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
        <Typography variant="h6" color="text.secondary">Tenant não encontrado.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/")}>Voltar</Button>
      </Container>
    );
  }

  const mpConnected = tenant.mercadoPago?.connected && tenant.mercadoPago?.tokenValid;

  if (!mpConnected) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Mercado Pago não está conectado ou o token expirou.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}`)}>Voltar ao Tenant</Button>
      </Container>
    );
  }

  const emailFilled = payerEmail.trim().length > 0;

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/tenants/${tenantId}`)}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Voltar ao Tenant
        </Button>

        <Stack direction="row" alignItems="center" gap={2} mb={4}>
          <LinkOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Gerar Link de Pagamento</Typography>
            <Typography variant="body2" color="text.secondary">
              {tenant.name}
            </Typography>
          </Box>
        </Stack>

        <Alert severity="info" sx={{ mb: 3 }}>
          Este link é para <strong>seus clientes pagarem</strong>. Envie via WhatsApp, e-mail ou onde preferir.
          Para testar sua conexão, use a opção{" "}
          <Typography
            component="span"
            variant="body2"
            sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
            onClick={() => navigate(`/tenants/${tenantId}/test-payment`)}
          >
            Testar sua conexão
          </Typography>.
        </Alert>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2.5}>

              {/* Valor */}
              <TextField
                label="Valor (R$)"
                placeholder="Ex: 150,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={!!amountError}
                helperText={amountError || " "}
                fullWidth
                required
                inputProps={{ inputMode: "decimal" }}
              />

              {/* Descrição */}
              <TextField
                label="Descrição do produto ou serviço"
                placeholder="Ex: Consultoria mensal — Março 2026"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={!!descriptionError}
                helperText={descriptionError || " "}
                fullWidth
                required
              />

              <Divider />

              {/* Email do pagador */}
              <Box>
                <TextField
                  label="E-mail do pagador (opcional)"
                  placeholder="cliente@email.com"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  fullWidth
                  type="email"
                  InputProps={{
                    endAdornment: emailFilled ? (
                      <InputAdornment position="end">
                        <CheckCircle color="success" fontSize="small" />
                      </InputAdornment>
                    ) : undefined,
                  }}
                  helperText={
                    emailFilled
                      ? "Ótimo — isso melhora a aprovação do pagamento."
                      : "Informar o e-mail do pagador aumenta a taxa de aprovação."
                  }
                  FormHelperTextProps={{
                    sx: { color: emailFilled ? "success.main" : "warning.main" },
                  }}
                />
              </Box>

              {/* Nome do pagador */}
              <TextField
                label="Nome do pagador (opcional)"
                placeholder="Ex: João Silva"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                fullWidth
                helperText=" "
              />

              <Divider />

              {/* Resultado */}
              {!generatedLink ? (
                <>
                  {generateError && (
                    <Alert severity="error">{generateError}</Alert>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={generating}
                    fullWidth
                    startIcon={generating ? <CircularProgress size={16} /> : <LinkOutlined />}
                    size="large"
                  >
                    {generating ? "Gerando link..." : "Gerar link de pagamento"}
                  </Button>
                </>
              ) : (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Link gerado com sucesso! Copie e envie ao seu cliente.
                  </Alert>

                  {/* Link sublinhado */}
                  <Stack direction="row" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                    <Typography
                      component="a"
                      href={generatedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{
                        color: "primary.main",
                        textDecoration: "underline",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        cursor: "pointer",
                      }}
                    >
                      <Launch fontSize="small" />
                      Ir para o Mercado Pago
                    </Typography>
                    <Tooltip title="Copiar link">
                      <IconButton size="small" onClick={handleCopy}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Ações */}
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<WhatsApp />}
                      onClick={handleWhatsApp}
                      sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5d" } }}
                    >
                      Compartilhar no WhatsApp
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopy />}
                      onClick={handleCopy}
                    >
                      Copiar link
                    </Button>
                  </Stack>

                  <Button
                    size="small"
                    sx={{ mt: 2, color: "text.secondary" }}
                    onClick={handleNewLink}
                  >
                    Gerar novo link
                  </Button>
                </Box>
              )}

            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
