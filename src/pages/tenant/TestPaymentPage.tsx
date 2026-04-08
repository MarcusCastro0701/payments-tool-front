import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  ExpandMore,
  ExpandLess,
  InfoOutlined,
  OpenInNew,
  PaymentOutlined,
} from "@mui/icons-material";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { tenantsApi, type Tenant } from "../../api/tenants";

// ---------------------------------------------------------------------------
// Dados aleatórios para pagamentos de teste
// ---------------------------------------------------------------------------

const TEST_TITLES = [
  "Assinatura Mensal",
  "Plano Premium",
  "Acesso Anual",
  "Pacote Profissional",
  "Licença de Software",
  "Curso Online",
  "Consultoria Especializada",
  "Serviço de Suporte",
  "Produto Digital",
  "Pacote Essencial",
];

const TEST_DESCRIPTIONS = [
  "Acesso completo à plataforma por 30 dias",
  "Plano premium com recursos avançados",
  "Licença anual com suporte prioritário",
  "Pacote profissional com integração completa",
  "Serviço de consultoria especializada",
  "Acesso a cursos e materiais exclusivos",
  "Suporte técnico dedicado ao cliente",
  "Produto digital com entrega imediata",
  "Plano para pequenas e médias empresas",
  "Assinatura com renovação automática",
];

const TEST_CATEGORIES = [
  "services",
  "entertainment",
  "education",
  "technology",
  "health",
  "sports_and_outdoors",
  "fashion",
  "food",
  "home_appliances",
  "games",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(): number {
  // Valor entre 20,00 e 49,99 com duas casas decimais
  const raw = Math.random() * (49.99 - 20.0) + 20.0;
  return Math.round(raw * 100) / 100;
}

// ---------------------------------------------------------------------------
// Cartões de teste sandbox (Brasil / MLB)
// ---------------------------------------------------------------------------

const SANDBOX_CARDS = [
  { brand: "Mastercard", type: "Crédito", number: "5031 4332 1540 6351", cvv: "123", exp: "11/30" },
  { brand: "Visa", type: "Crédito", number: "4235 6477 2802 5682", cvv: "123", exp: "11/30" },
  { brand: "Amex", type: "Crédito", number: "3753 651535 56885", cvv: "1234", exp: "11/30" },
  { brand: "Elo", type: "Débito", number: "5067 7667 8388 8311", cvv: "123", exp: "11/30" },
];

const SANDBOX_NAME_CODES = [
  { name: "APRO", cpf: "12345678909", result: "Aprovado" },
  { name: "OTHE", cpf: "12345678909", result: "Recusado — erro geral" },
  { name: "FUND", cpf: "—", result: "Recusado — saldo insuficiente" },
  { name: "SECU", cpf: "—", result: "Recusado — CVV inválido" },
  { name: "EXPI", cpf: "—", result: "Recusado — cartão vencido" },
  { name: "CONT", cpf: "—", result: "Pendente" },
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

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

  const [sandboxOpen, setSandboxOpen] = useState(false);

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
      const res = await tenantsApi.createPreference(Number(tenantId), {
        amount: randomAmount(),
        title: pickRandom(TEST_TITLES),
        description: pickRandom(TEST_DESCRIPTIONS),
        category: pickRandom(TEST_CATEGORIES),
      });
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
        amount: randomAmount(),
        description: pickRandom(TEST_DESCRIPTIONS),
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
            {tenant.name} — valores e dados gerados aleatoriamente a cada tentativa
          </Typography>
        </Box>
      </Stack>

      {/* Seção de cartões sandbox */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 3, borderColor: "info.light" }}>
        <CardContent sx={{ pb: "12px !important" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ cursor: "pointer" }}
            onClick={() => setSandboxOpen((v) => !v)}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <InfoOutlined color="info" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700} color="info.main">
                Dados para teste (sandbox)
              </Typography>
              <Chip label="Somente contas de teste MP" size="small" color="info" variant="outlined" />
            </Stack>
            {sandboxOpen ? <ExpandLess color="info" /> : <ExpandMore color="info" />}
          </Stack>

          <Collapse in={sandboxOpen}>
            <Box mt={2}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Use estes dados apenas quando a conta MP conectada ao tenant for uma{" "}
                <strong>conta de teste (sandbox)</strong>. Em produção, use cartões reais.
              </Alert>

              <Typography variant="body2" fontWeight={700} mb={1}>
                Cartões de teste — Brasil (MLB)
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Bandeira</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Número</TableCell>
                    <TableCell>CVV</TableCell>
                    <TableCell>Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SANDBOX_CARDS.map((card) => (
                    <TableRow key={card.number}>
                      <TableCell>{card.brand}</TableCell>
                      <TableCell>{card.type}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {card.number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {card.cvv}
                        </Typography>
                      </TableCell>
                      <TableCell>{card.exp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="body2" fontWeight={700} mb={1}>
                Resultado pelo nome do titular
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                No campo "Nome do titular", digite exatamente um dos códigos abaixo para controlar o resultado.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome do titular</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Resultado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SANDBOX_NAME_CODES.map((code) => (
                    <TableRow key={code.name}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={700}>
                          {code.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {code.cpf}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={code.result}
                          size="small"
                          color={
                            code.result === "Aprovado"
                              ? "success"
                              : code.result === "Pendente"
                              ? "warning"
                              : "error"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

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
              Abre a tela de pagamento do Mercado Pago em uma nova aba. Valor e dados gerados
              aleatoriamente. Confira o resultado na{" "}
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
              Abra o link em uma aba anônima ou use outra conta.
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
                    initialization={{ amount: randomAmount() }}
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
