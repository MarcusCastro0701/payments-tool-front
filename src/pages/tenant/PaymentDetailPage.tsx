import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Alert,
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
import { ArrowBackIosNew, OpenInNewOutlined, ReceiptLongOutlined, SyncOutlined } from "@mui/icons-material";
import { tenantsApi, type PaymentDetail } from "../../api/tenants";

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  APPROVED: { label: "Aprovado",    color: "success" },
  PENDING:  { label: "Pendente",    color: "warning" },
  DECLINED: { label: "Recusado",    color: "error"   },
  CANCELED: { label: "Cancelado",   color: "error"   },
  REFUNDED: { label: "Reembolsado", color: "default" },
};

const REFUND_STATUS: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  approved: { label: "Aprovado",  color: "success" },
  pending:  { label: "Pendente",  color: "warning" },
  rejected: { label: "Rejeitado", color: "error"   },
};

const METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD:   "Cartão de crédito",
  DEBIT_CARD:    "Cartão de débito",
  PIX:           "PIX",
  BOLETO:        "Boleto",
  BANK_TRANSFER: "Transferência bancária",
  MERCADOPAGO:   "Mercado Pago",
};

const CHECKOUT_LABELS: Record<string, string> = {
  checkout_pro:  "Checkout Pro",
  payment_brick: "Payment Brick",
};

function formatBRL(v: string | number | null | undefined, currency = "BRL") {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(v));
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500} textAlign="right" sx={{ maxWidth: "60%" }}>{value}</Typography>
    </Stack>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.8} sx={{ textTransform: "uppercase", mb: 1, display: "block" }}>
      {children}
    </Typography>
  );
}

export function PaymentDetailPage() {
  const { tenantId, paymentId } = useParams<{ tenantId: string; paymentId: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !paymentId) return;
    tenantsApi
      .showPayment(Number(tenantId), Number(paymentId))
      .then((res) => setPayment(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId, paymentId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !payment) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">Pagamento não encontrado.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}/payments`)}>Voltar</Button>
      </Container>
    );
  }

  async function handleSync() {
    if (!tenantId || !paymentId) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await tenantsApi.syncPayment(Number(tenantId), Number(paymentId));
      setPayment(res.data);
    } catch {
      setSyncError("Erro ao sincronizar. Verifique a conexão com o Mercado Pago.");
    } finally {
      setSyncing(false);
    }
  }

  const st  = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING;
  const m   = (payment.metadata as Record<string, any>) ?? {};
  const isCard        = ["credit_card", "debit_card"].includes(m.paymentTypeId ?? "");
  const isInstallment = isCard && m.installments > 1;
  const isPartialRefund = payment.refunds.some((r) => Number(r.amount) < Number(payment.amount));

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate(`/tenants/${tenantId}/payments`)}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Voltar aos Pagamentos
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" gap={2}>
          <ReceiptLongOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Pagamento #{payment.id}</Typography>
            <Typography variant="body2" color="text.secondary">Detalhes completos</Typography>
          </Box>
        </Stack>
        {payment.mpPaymentId && (
          <Button
            size="small"
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={14} /> : <SyncOutlined />}
            disabled={syncing}
            onClick={handleSync}
          >
            {syncing ? "Sincronizando…" : "Sincronizar com MP"}
          </Button>
        )}
      </Stack>

      {syncError && <Alert severity="error" sx={{ mb: 2 }}>{syncError}</Alert>}

      <Stack spacing={2}>

        {/* ── Resumo ── */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>{formatBRL(payment.amount, payment.currency)}</Typography>
              <Chip label={st.label} color={st.color} />
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <SectionTitle>Identificação</SectionTitle>
            <Stack divider={<Divider />} mb={2}>
              <Row label="ID interno"     value={`#${payment.id}`} />
              {payment.mpPaymentId  && <Row label="ID Mercado Pago"    value={payment.mpPaymentId} />}
              {payment.externalId   && <Row label="Referência externa" value={payment.externalId} />}
              {m.statusDetail       && <Row label="Detalhe do status"  value={m.statusDetail} />}
              {m.statementDescriptor && <Row label="Descrição na fatura" value={m.statementDescriptor} />}
            </Stack>

            <SectionTitle>Pagamento</SectionTitle>
            <Stack divider={<Divider />} mb={2}>
              <Row label="Método"  value={METHOD_LABELS[payment.method] ?? payment.method} />
              <Row label="Origem"  value={payment.origin === "PANEL" ? "Área de teste" : "Site do negócio"} />
              {m.checkoutMethod && <Row label="Checkout" value={CHECKOUT_LABELS[m.checkoutMethod] ?? m.checkoutMethod} />}
              {m.paymentMethodId && <Row label="Bandeira / método" value={m.paymentMethodId} />}
              {m.issuerId        && <Row label="Emissor"           value={m.issuerId} />}
              {payment.description && <Row label="Descrição" value={payment.description} />}
              <Row label="Data"   value={new Date(payment.createdAt).toLocaleString("pt-BR")} />
              {m.dateApproved    && <Row label="Data de aprovação"  value={new Date(m.dateApproved).toLocaleString("pt-BR")} />}
              {m.moneyReleaseDate && <Row label="Liberação do valor" value={new Date(m.moneyReleaseDate).toLocaleString("pt-BR")} />}
            </Stack>

            {/* Parcelamento — só exibe se cartão */}
            {isCard && (
              <>
                <SectionTitle>Parcelamento</SectionTitle>
                <Stack divider={<Divider />} mb={2}>
                  <Row label="Parcelas"           value={isInstallment ? `${m.installments}x` : "À vista"} />
                  {isInstallment && m.installmentAmount != null && (
                    <Row label="Valor por parcela" value={formatBRL(m.installmentAmount, payment.currency)} />
                  )}
                  {m.totalPaidAmount != null && (
                    <Row label="Total pago pelo comprador" value={formatBRL(m.totalPaidAmount, payment.currency)} />
                  )}
                  {m.netReceivedAmount != null && (
                    <Row label="Valor líquido recebido" value={formatBRL(m.netReceivedAmount, payment.currency)} />
                  )}
                  {m.feesAmount != null && (
                    <Row label="Taxas Mercado Pago" value={formatBRL(m.feesAmount, payment.currency)} />
                  )}
                  {m.overpaidAmount != null && Number(m.overpaidAmount) > 0 && (
                    <Row label="Valor excedente" value={formatBRL(m.overpaidAmount, payment.currency)} />
                  )}
                </Stack>
              </>
            )}

            {/* Detalhes do cartão */}
            {isCard && (m.cardLastFour || m.cardHolder) && (
              <>
                <SectionTitle>Cartão</SectionTitle>
                <Stack divider={<Divider />} mb={2}>
                  {m.cardBin && m.cardLastFour && (
                    <Row label="Número" value={`${m.cardBin} •••• ${m.cardLastFour}`} />
                  )}
                  {m.cardExpiration && <Row label="Validade"    value={m.cardExpiration} />}
                  {m.cardHolder     && <Row label="Titular"     value={m.cardHolder} />}
                </Stack>
              </>
            )}

            {/* Pagador */}
            {m.payerEmail && (
              <>
                <SectionTitle>Pagador</SectionTitle>
                <Stack divider={<Divider />} mb={2}>
                  <Row label="E-mail" value={m.payerEmail} />
                </Stack>
              </>
            )}

            {/* Taxas detalhadas (não-cartão ou quando não mostrou no parcelamento) */}
            {!isCard && m.feeDetails && (m.feeDetails as any[]).length > 0 && (
              <>
                <SectionTitle>Taxas</SectionTitle>
                <Stack divider={<Divider />} mb={2}>
                  {(m.feeDetails as any[]).map((f: any, i: number) => (
                    <Row key={i} label={f.type ?? `Taxa ${i + 1}`} value={formatBRL(f.amount, payment.currency)} />
                  ))}
                  {m.netReceivedAmount != null && (
                    <Row label="Valor líquido recebido" value={formatBRL(m.netReceivedAmount, payment.currency)} />
                  )}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Reembolsos ── */}
        {payment.refunds.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Reembolsos ({payment.refunds.length})
                </Typography>
                {isPartialRefund && (
                  <Chip label="Parcial" size="small" variant="outlined" />
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {payment.refunds.map((r) => {
                  const rst     = REFUND_STATUS[r.status] ?? { label: r.status, color: "default" as const };
                  const partial = Number(r.amount) < Number(payment.amount);
                  return (
                    <Stack
                      key={r.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ cursor: "pointer", py: 0.5 }}
                      onClick={() => window.open(`/tenants/${tenantId}/refunds/${payment.id}/${r.id}`, "_blank")}
                    >
                      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>
                          {formatBRL(r.amount, payment.currency)}
                        </Typography>
                        {partial && <Typography variant="caption" color="text.secondary">(parcial)</Typography>}
                        <Chip label={rst.label} color={rst.color} size="small" />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(r.createdAt).toLocaleString("pt-BR")}
                        </Typography>
                      </Stack>
                      <OpenInNewOutlined fontSize="small" color="action" />
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {payment.status === "APPROVED" && payment.refunds.length === 0 && (
          <Alert severity="info">Nenhum reembolso registrado para este pagamento.</Alert>
        )}
      </Stack>
    </Container>
  );
}
