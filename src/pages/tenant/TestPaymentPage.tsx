import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  CheckCircleOutline,
  ContentCopy,
  ExpandLess,
  ExpandMore,
  InfoOutlined,
  Launch,
  OpenInNew,
  PaymentOutlined,
  ScienceOutlined,
  SendOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { tenantsApi, type Tenant } from "../../api/tenants";

// ---------------------------------------------------------------------------
// Dados aleatórios
// ---------------------------------------------------------------------------

const TEST_TITLES = [
  "Assinatura Mensal", "Plano Premium", "Acesso Anual", "Pacote Profissional",
  "Licença de Software", "Curso Online", "Consultoria Especializada",
  "Serviço de Suporte", "Produto Digital", "Pacote Essencial",
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
  "services", "entertainment", "education", "technology", "health",
  "sports_and_outdoors", "fashion", "food", "home_appliances", "games",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomAmount(): number {
  return Math.round((Math.random() * (49.99 - 20.0) + 20.0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Cartões sandbox
// ---------------------------------------------------------------------------

const SANDBOX_CARDS = [
  { brand: "Mastercard", type: "Crédito", number: "5031 4332 1540 6351", cvv: "123", exp: "11/30" },
  { brand: "Visa",       type: "Crédito", number: "4235 6477 2802 5682", cvv: "123", exp: "11/30" },
  { brand: "Amex",       type: "Crédito", number: "3753 651535 56885",   cvv: "1234", exp: "11/30" },
  { brand: "Elo",        type: "Débito",  number: "5067 7667 8388 8311", cvv: "123", exp: "11/30" },
];
const SANDBOX_NAME_CODES = [
  { name: "APRO", cpf: "12345678909", result: "Aprovado",                  color: "success" as const },
  { name: "OTHE", cpf: "12345678909", result: "Recusado — erro geral",     color: "error"   as const },
  { name: "FUND", cpf: "—",           result: "Saldo insuficiente",        color: "error"   as const },
  { name: "SECU", cpf: "—",           result: "CVV inválido",              color: "error"   as const },
  { name: "EXPI", cpf: "—",           result: "Cartão vencido",            color: "error"   as const },
  { name: "CONT", cpf: "—",           result: "Pendente",                  color: "warning" as const },
];

// ---------------------------------------------------------------------------
// Popup inicial da página
// ---------------------------------------------------------------------------

function PageIntroPopup({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  function handleClose() {
    localStorage.setItem(`test_payment_intro_seen_${tenantId}`, "1");
    onClose();
  }
  return (
    <Backdrop open sx={{ zIndex: 1300, backdropFilter: "blur(6px)" }}>
      <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 4, maxWidth: 480, mx: 2, boxShadow: 24, textAlign: "center" }}>
        <ScienceOutlined color="primary" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" fontWeight={700} mb={1}>Painel de Teste de Conexão</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Este painel existe para que <strong>você</strong> verifique, com seus próprios olhos,
          que a conexão com o Mercado Pago está funcionando — o pagamento é processado e o valor
          cai na sua conta.
        </Typography>
        <Alert severity="warning" sx={{ mb: 3, textAlign: "left" }}>
          <strong>Não é para cobrar clientes.</strong> Para gerar links de pagamento para enviar
          a clientes, use "Gerar Links de Pagamento" na tela do tenant.
        </Alert>
        <Button variant="contained" onClick={handleClose} fullWidth>
          Entendi, quero testar
        </Button>
      </Box>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Popup explicativo do Checkout Pro (primeira vez que clica em gerar)
// ---------------------------------------------------------------------------

function CheckoutProIntroPopup({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [seconds, setSeconds] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  function handleClose() {
    localStorage.setItem(`checkout_pro_intro_seen_${tenantId}`, "1");
    onClose();
  }

  return (
    <Backdrop open sx={{ zIndex: 1300, backdropFilter: "blur(6px)" }}>
      <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 4, maxWidth: 520, mx: 2, boxShadow: 24 }}>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <OpenInNew color="primary" />
          <Typography variant="h6" fontWeight={700}>Como funciona o Checkout Pro</Typography>
        </Stack>
        <CheckoutProExplanation />
        <Box mt={3}>
          <LinearProgress variant="determinate" value={((10 - seconds) / 10) * 100} sx={{ mb: 2, borderRadius: 1 }} />
          {seconds > 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Leia com atenção — botão disponível em {seconds}s
            </Typography>
          ) : (
            <Button variant="contained" fullWidth onClick={handleClose}>
              Estou pronto para testar
            </Button>
          )}
        </Box>
      </Box>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Explicação do Checkout Pro (popup + accordion compartilham o mesmo conteúdo)
// ---------------------------------------------------------------------------

function CheckoutProExplanation() {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        O <strong>Checkout Pro</strong> é um link de pagamento gerado pela API do Mercado Pago.
        Ao clicar, o pagador é redirecionado para a interface oficial do MP para concluir o pagamento.
      </Typography>
      <Alert severity="info" icon={<InfoOutlined fontSize="small" />}>
        <Typography variant="body2">
          Abra o link em uma <strong>aba anônima</strong> sem logar em nenhuma conta do Mercado Pago.
          Use o cartão de crédito pessoal normalmente — o valor é cobrado de verdade e cai na sua conta.
          Disponível <strong>1 vez a cada 7 dias</strong>.
        </Typography>
      </Alert>
      <Alert severity="warning">
        <Typography variant="body2">
          Você <strong>não pode pagar com a mesma conta MP</strong> conectada ao tenant.
          A aba anônima garante que você não estará logado como vendedor ao testar como comprador.
        </Typography>
      </Alert>
      <Alert severity="success" icon={<SendOutlined fontSize="small" />}>
        <Typography variant="body2">
          Quer que outra pessoa teste? Use a página{" "}
          <strong>"Gerar Links de Pagamento"</strong> — sem limite de frequência.
        </Typography>
      </Alert>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function TestPaymentPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Popups
  const [showPageIntro, setShowPageIntro] = useState(
    !localStorage.getItem(`test_payment_intro_seen_${tenantId}`)
  );
  const [showCheckoutIntro, setShowCheckoutIntro] = useState(false);

  // Accordion
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [checkoutExplainOpen, setCheckoutExplainOpen] = useState(false);

  // Limite 7 dias
  const [hasRecentPayment, setHasRecentPayment] = useState(false);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Link gerado
  const [loadingPreference, setLoadingPreference] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  // Brick
  const [brickReady, setBrickReady] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ status: string; id: number } | null>(null);
  const [brickError, setBrickError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  const statusParam = searchParams.get("status");

  const fetchTenant = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    tenantsApi.show(Number(tenantId))
      .then((res) => setTenant(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const fetchTestConfig = useCallback(() => {
    if (!tenantId) return;
    tenantsApi.getTestConfig(Number(tenantId))
      .then((res) => {
        setHasRecentPayment(res.data.hasRecentPayment);
        setNextAvailableAt(res.data.nextAvailableAt);
      })
      .finally(() => setLoadingConfig(false));
  }, [tenantId]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);
  useEffect(() => { fetchTestConfig(); }, [fetchTestConfig]);

  useEffect(() => {
    const publicKey = tenant?.mercadoPago?.publicKey;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      setBrickReady(true);
    }
  }, [tenant?.mercadoPago?.publicKey]);

  // Clique no botão "Gerar link de teste"
  function handleGenerateButtonClick() {
    const introSeen = !!localStorage.getItem(`checkout_pro_intro_seen_${tenantId}`);
    if (!introSeen) {
      // Primeira vez: mostra popup; ao fechar, gera automaticamente
      setShowCheckoutIntro(true);
    } else {
      handleGenerateCheckoutPro();
    }
  }

  // Popup fechou: gera o link automaticamente
  function handleCheckoutIntroClose() {
    setShowCheckoutIntro(false);
    handleGenerateCheckoutPro();
  }

  async function handleGenerateCheckoutPro() {
    if (!tenantId) return;
    setLoadingPreference(true);
    setPreferenceError(null);
    setGeneratedLink(null);
    try {
      const res = await tenantsApi.createPreference(Number(tenantId), {
        amount: randomAmount(),
        title: pickRandom(TEST_TITLES),
        description: pickRandom(TEST_DESCRIPTIONS),
        category: pickRandom(TEST_CATEGORIES),
        testMode: "solo",
      });
      if (!res.data.initPoint) {
        setPreferenceError("Mercado Pago não retornou o link de pagamento.");
        return;
      }
      setGeneratedLink(res.data.initPoint);
      setHasRecentPayment(true);
      setNextAvailableAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erro ao gerar link. Verifique se o token MP está válido.";
      setPreferenceError(msg);
    } finally {
      setLoadingPreference(false);
    }
  }

  function handleCopy(text: string, label = "Link copiado!") {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: label });
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
      setPaymentResult({ status: res.data.mpStatus, id: res.data.id });
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
        <Typography variant="h6" color="text.secondary">Tenant não encontrado.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/")}>Voltar</Button>
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
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}`)}>Voltar ao Tenant</Button>
      </Container>
    );
  }

  const nextDate = nextAvailableAt
    ? new Date(nextAvailableAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      {showPageIntro && (
        <PageIntroPopup tenantId={tenantId!} onClose={() => setShowPageIntro(false)} />
      )}
      {showCheckoutIntro && (
        <CheckoutProIntroPopup tenantId={tenantId!} onClose={handleCheckoutIntroClose} />
      )}

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/tenants/${tenantId}`)}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Voltar ao Tenant
        </Button>

        <Stack direction="row" alignItems="center" gap={2} mb={4}>
          <ScienceOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Teste de Conexão</Typography>
            <Typography variant="body2" color="text.secondary">
              {tenant.name} — verifique que sua integração com o Mercado Pago está funcionando
            </Typography>
          </Box>
        </Stack>

        <Alert severity="info" sx={{ mb: 3 }}>
          Este painel é para <strong>testar sua conexão</strong>. Para enviar links de pagamento a clientes,{" "}
          <Typography
            component="span" variant="body2"
            sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
            onClick={() => navigate(`/tenants/${tenantId}/generate-link`)}
          >
            use a página de geração de links
          </Typography>.
        </Alert>

        {statusParam && (
          <Alert
            severity={statusParam === "success" ? "success" : statusParam === "pending" ? "warning" : "error"}
            sx={{ mb: 3 }}
          >
            {statusParam === "success" && (
              <>Pagamento aprovado!{" "}
                <Typography component="span" variant="body2"
                  sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => navigate(`/tenants/${tenantId}/payments`)}>
                  Ver pagamentos
                </Typography>
              </>
            )}
            {statusParam === "pending" && "Pagamento pendente. Aguardando confirmação."}
            {statusParam === "failure" && "Pagamento recusado ou cancelado."}
          </Alert>
        )}

        <Stack spacing={3}>

          {/* ── Checkout Pro ── */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <PaymentOutlined color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Opção 1 — Checkout Pro</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Gera um link que redireciona para a tela de pagamento oficial do Mercado Pago.
                Abra em aba anônima e use o cartão pessoal. Disponível 1x a cada 7 dias.
              </Typography>

              {/* Accordion: Como funciona */}
              <Box
                sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}
                onClick={() => setCheckoutExplainOpen((v) => !v)}
              >
                <InfoOutlined fontSize="small" color="info" />
                <Typography variant="body2" color="info.main" fontWeight={600}>
                  Como funciona o Checkout Pro?
                </Typography>
                {checkoutExplainOpen ? <ExpandLess fontSize="small" color="info" /> : <ExpandMore fontSize="small" color="info" />}
              </Box>
              <Collapse in={checkoutExplainOpen}>
                <Box sx={{ mb: 2, borderLeft: "3px solid", borderColor: "info.light", pl: 2 }}>
                  <CheckoutProExplanation />
                </Box>
              </Collapse>

              <Divider sx={{ mb: 2 }} />

              {loadingConfig ? (
                <CircularProgress size={20} />
              ) : hasRecentPayment ? (
                <Alert severity="warning" icon={<WarningAmberOutlined />}>
                  Você já realizou um teste nos últimos 7 dias.
                  {nextDate && <> Disponível novamente em <strong>{nextDate}</strong>.</>}
                </Alert>
              ) : !generatedLink ? (
                <>
                  {preferenceError && <Alert severity="error" sx={{ mb: 2 }}>{preferenceError}</Alert>}
                  <Button
                    variant="contained"
                    onClick={handleGenerateButtonClick}
                    disabled={loadingPreference}
                    startIcon={loadingPreference ? <CircularProgress size={16} /> : <OpenInNew />}
                  >
                    {loadingPreference ? "Gerando link..." : "Gerar link de teste"}
                  </Button>
                </>
              ) : (
                <Box>
                  <Typography variant="body2" fontWeight={600} mb={1}>Link gerado:</Typography>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                    <Typography
                      component="a" href={generatedLink} target="_blank" rel="noopener noreferrer"
                      variant="body2"
                      sx={{ color: "primary.main", textDecoration: "underline", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}
                    >
                      <Launch fontSize="small" />
                      Ir para o Mercado Pago
                    </Typography>
                    <Tooltip title="Copiar link">
                      <IconButton size="small" onClick={() => handleCopy(generatedLink)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Abra em uma <strong>aba anônima</strong> sem logar no Mercado Pago.
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ── Cartões sandbox ── */}
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "info.light" }}>
            <CardContent sx={{ pb: "12px !important" }}>
              <Stack
                direction="row" alignItems="center" justifyContent="space-between"
                sx={{ cursor: "pointer" }}
                onClick={() => setSandboxOpen((v) => !v)}
              >
                <Stack direction="row" alignItems="center" gap={1}>
                  <InfoOutlined color="info" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} color="info.main">
                    Dados para teste (contas sandbox MP)
                  </Typography>
                  <Chip label="Apenas contas de teste" size="small" color="info" variant="outlined" />
                </Stack>
                {sandboxOpen ? <ExpandLess color="info" /> : <ExpandMore color="info" />}
              </Stack>

              <Collapse in={sandboxOpen}>
                <Box mt={2}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Use estes dados <strong>somente</strong> se a conta MP conectada for uma conta de teste (sandbox).
                    Com conta de produção, use cartão real.
                  </Alert>
                  <Typography variant="body2" fontWeight={700} mb={1}>Cartões de teste — Brasil (MLB)</Typography>
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Bandeira</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Número</TableCell>
                        <TableCell>CVV</TableCell>
                        <TableCell>Venc.</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {SANDBOX_CARDS.map((card) => (
                        <TableRow key={card.number}>
                          <TableCell>{card.brand}</TableCell>
                          <TableCell>{card.type}</TableCell>
                          <TableCell><Typography variant="body2" fontFamily="monospace">{card.number}</Typography></TableCell>
                          <TableCell><Typography variant="body2" fontFamily="monospace">{card.cvv}</Typography></TableCell>
                          <TableCell>{card.exp}</TableCell>
                          <TableCell>
                            <Tooltip title="Copiar número">
                              <IconButton size="small" onClick={() => handleCopy(card.number.replace(/\s/g, ""), "Número copiado!")}>
                                <ContentCopy fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Typography variant="body2" fontWeight={700} mb={1}>Resultado pelo nome do titular</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Digite exatamente um dos códigos abaixo no campo "Nome do titular" para controlar o resultado.
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>CPF</TableCell>
                        <TableCell>Resultado</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {SANDBOX_NAME_CODES.map((code) => (
                        <TableRow key={code.name}>
                          <TableCell><Typography variant="body2" fontFamily="monospace" fontWeight={700}>{code.name}</Typography></TableCell>
                          <TableCell><Typography variant="body2" fontFamily="monospace">{code.cpf}</Typography></TableCell>
                          <TableCell><Chip label={code.result} size="small" color={code.color} variant="outlined" /></TableCell>
                          <TableCell>
                            <Tooltip title="Copiar">
                              <IconButton size="small" onClick={() => handleCopy(code.name, "Copiado!")}>
                                <ContentCopy fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* ── Payment Brick ── */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <CheckCircleOutline color="success" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Opção 2 — Payment Brick (embutido)</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Checkout direto nesta tela. Use o cartão pessoal — sem limite de frequência.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {paymentResult ? (
                <Alert severity={paymentResult.status === "approved" ? "success" : paymentResult.status === "pending" ? "warning" : "error"}>
                  <Typography fontWeight={600} gutterBottom>
                    {paymentResult.status === "approved" && "Pagamento aprovado!"}
                    {paymentResult.status === "pending" && "Pagamento sendo processado."}
                    {paymentResult.status === "rejected" && "Pagamento recusado."}
                    {!["approved","pending","rejected"].includes(paymentResult.status) && `Status: ${paymentResult.status}`}
                  </Typography>
                  <Typography variant="body2">
                    Verifique na{" "}
                    <Typography component="span" variant="body2"
                      sx={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => navigate(`/tenants/${tenantId}/payments`)}>
                      listagem de pagamentos
                    </Typography>.
                  </Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => { setPaymentResult(null); setBrickError(null); }}>
                    Fazer outro pagamento
                  </Button>
                </Alert>
              ) : (
                <>
                  {brickError && <Alert severity="error" sx={{ mb: 2 }}>{brickError}</Alert>}
                  {processing && (
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">Processando...</Typography>
                    </Box>
                  )}
                  {brickReady && !processing && (
                    <Payment
                      initialization={{ amount: randomAmount() }}
                      customization={{ paymentMethods: { creditCard: "all", debitCard: "all", ticket: "all", bankTransfer: "all", atm: "all", mercadoPago: "all" } }}
                      onSubmit={async ({ formData }) => { await handleBrickSubmit(formData); }}
                      onError={(error) => { console.error("Brick error:", error); setBrickError("Erro no componente de pagamento."); }}
                    />
                  )}
                  {!brickReady && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">Carregando checkout...</Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </Stack>
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
