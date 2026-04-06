import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBackIosNew, OpenInNew, PaymentOutlined } from "@mui/icons-material";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { tenantsApi, type Tenant } from "../../api/tenants";

const TEST_AMOUNT = 1.0;

export function TestPaymentPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [loadingPreference, setLoadingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  const [brickReady, setBrickReady] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: string;
    detail: string;
    id: number;
  } | null>(null);
  const [brickError, setBrickError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const statusParam = searchParams.get("status");

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

  useEffect(() => {
    const publicKey = tenant?.mercadoPago?.publicKey;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      setBrickReady(true);
    }
  }, [tenant?.mercadoPago?.publicKey]);

  async function handleCheckoutPro() {
    if (!tenantId) return;
    setLoadingPreference(true);
    setPreferenceError(null);
    try {
      const res = await tenantsApi.createPreference(Number(tenantId));
      const initPoint = res.data.initPoint;
      if (!initPoint) {
        setPreferenceError("Mercado Pago não retornou o link de pagamento.");
        return;
      }
      window.open(initPoint, "_blank");
    } catch {
      setPreferenceError("Erro ao criar preferência. Verifique se o token MP está válido.");
    } finally {
      setLoadingPreference(false);
    }
  }

  async function handleBrickSubmit(formData: any) {
    if (!tenantId) return;
    setProcessing(true);
    setBrickError(null);
    try {
      const res = await tenantsApi.processPayment(Number(tenantId), {
        formData,
        amount: TEST_AMOUNT,
        description: "Pagamento Teste",
      });
      setPaymentResult({
        status: res.data.mpStatus,
        detail: res.data.mpStatusDetail,
        id: res.data.id,
      });
    } catch {
      setBrickError("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setProcessing(false);
    }
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

  const mpConnected = tenant.mercadoPago?.connected && tenant.mercadoPago?.tokenValid;
  const publicKey = tenant.mercadoPago?.publicKey ?? null;

  if (!mpConnected || !publicKey) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Mercado Pago não está conectado ou o token expirou.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}`)}>
          Voltar ao Tenant
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate(`/tenants/${tenantId}`)}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Voltar ao Tenant
      </Button>

      <Stack direction="row" alignItems="center" gap={2} mb={4}>
        <PaymentOutlined color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Pagamento Teste
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tenant.name} — valor: R$ {TEST_AMOUNT.toFixed(2)}
          </Typography>
        </Box>
      </Stack>

      {statusParam && (
        <Alert
          severity={statusParam === "success" ? "success" : statusParam === "pending" ? "warning" : "error"}
          sx={{ mb: 3 }}
        >
          {statusParam === "success" && (
            <>
              Pagamento aprovado com sucesso!{" "}
              <Typography
                component="span"
                variant="body2"
                sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                onClick={() => navigate(`/tenants/${tenantId}/payments`)}
              >
                Ver listagem de pagamentos
              </Typography>
            </>
          )}
          {statusParam === "pending" && "Pagamento pendente. Aguardando confirmação."}
          {statusParam === "failure" && "Pagamento recusado ou cancelado."}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Checkout Pro */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Opção 1 — Checkout Pro
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Abre a tela de pagamento do Mercado Pago em uma nova aba. Você seleciona o método lá.
              Depois você pode conferir o status do pagamento na{" "}
              <Typography
                component="span"
                variant="body2"
                sx={{ textDecoration: "underline", cursor: "pointer", color: "primary.main" }}
                onClick={() => navigate(`/tenants/${tenantId}/payments`)}
              >
                listagem de pagamentos
              </Typography>
              .
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Você não pode pagar com a mesma conta do Mercado Pago que está conectada a este tenant.
              Abra o link em uma aba anônima ou use outra conta para realizar o pagamento.
            </Alert>
            <Divider sx={{ mb: 2 }} />
            {preferenceError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {preferenceError}
              </Alert>
            )}
            <Button
              variant="contained"
              onClick={handleCheckoutPro}
              disabled={loadingPreference}
              startIcon={loadingPreference ? <CircularProgress size={16} /> : <OpenInNew />}
            >
              {loadingPreference ? "Gerando link..." : "Ir para o Checkout Pro"}
            </Button>
          </CardContent>
        </Card>

        {/* Payment Brick */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Opção 2 — Payment Brick (embutido)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Checkout completo direto nesta tela. Aceita PIX, cartão de crédito e débito.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {paymentResult ? (
              <Alert
                severity={
                  paymentResult.status === "approved"
                    ? "success"
                    : paymentResult.status === "pending"
                    ? "warning"
                    : "error"
                }
              >
                <Typography fontWeight={600} gutterBottom>
                  {paymentResult.status === "approved" && "Pagamento aprovado!"}
                  {paymentResult.status === "pending" && "Pagamento sendo processado."}
                  {paymentResult.status === "rejected" && "Pagamento recusado."}
                  {!["approved", "pending", "rejected"].includes(paymentResult.status) &&
                    `Status: ${paymentResult.status}`}
                </Typography>
                <Typography variant="body2">
                  Verifique o status na{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => navigate(`/tenants/${tenantId}/payments`)}
                  >
                    listagem de pagamentos
                  </Typography>
                  .
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setPaymentResult(null);
                    setBrickError(null);
                  }}
                >
                  Fazer outro pagamento
                </Button>
              </Alert>
            ) : (
              <>
                {brickError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {brickError}
                  </Alert>
                )}
                {processing && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Processando pagamento...
                    </Typography>
                  </Box>
                )}
                {brickReady && !processing && (
                  <Payment
                    initialization={{ amount: TEST_AMOUNT }}
                    customization={{
                      paymentMethods: {
                        creditCard: "all",
                        debitCard: "all",
                        ticket: "all",
                        bankTransfer: "all",
                        atm: "all",
                        mercadoPago: "all",
                      },
                    }}
                    onSubmit={async ({ formData }) => {
                      await handleBrickSubmit(formData);
                    }}
                    onError={(error) => {
                      console.error("Payment Brick error:", error);
                      setBrickError("Erro no componente de pagamento.");
                    }}
                  />
                )}
                {!brickReady && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Carregando checkout...
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
