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
import { ArrowBackIosNew, ReceiptLongOutlined } from "@mui/icons-material";
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

function formatCurrency(amount: string, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount));
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Stack>
  );
}

export function PaymentDetailPage() {
  const { tenantId, paymentId } = useParams<{ tenantId: string; paymentId: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  const st = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING;
  const meta = payment.metadata as Record<string, any> ?? {};
  const isPartialRefund =
    payment.refunds.length > 0 &&
    payment.refunds.some((r) => Number(r.amount) < Number(payment.amount));

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate(`/tenants/${tenantId}/payments`)}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Voltar aos Pagamentos
      </Button>

      <Stack direction="row" alignItems="center" gap={2} mb={4}>
        <ReceiptLongOutlined color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Pagamento #{payment.id}</Typography>
          <Typography variant="body2" color="text.secondary">Detalhes completos</Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        {/* Status + valor */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>{formatCurrency(payment.amount, payment.currency)}</Typography>
              <Chip label={st.label} color={st.color} />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack divider={<Divider />}>
              <Row label="ID interno" value={`#${payment.id}`} />
              <Row label="Método" value={METHOD_LABELS[payment.method] ?? payment.method} />
              <Row label="Origem" value={payment.origin === "PANEL" ? "Área de teste" : "Site do negócio"} />
              <Row label="Data" value={new Date(payment.createdAt).toLocaleString("pt-BR")} />
              {payment.description && <Row label="Descrição" value={payment.description} />}
              {payment.mpPaymentId && <Row label="ID Mercado Pago" value={payment.mpPaymentId} />}
              {payment.externalId && <Row label="Referência externa" value={payment.externalId} />}
              {meta.installments > 1 && (
                <Row label="Parcelas" value={`${meta.installments}x`} />
              )}
              {meta.checkoutMethod && (
                <Row
                  label="Checkout"
                  value={meta.checkoutMethod === "checkout_pro" ? "Checkout Pro" : "Payment Brick"}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Reembolsos */}
        {payment.refunds.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Reembolsos ({payment.refunds.length})
                </Typography>
                {isPartialRefund && (
                  <Chip label="Reembolso parcial" size="small" variant="outlined" />
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {payment.refunds.map((r) => {
                  const rst = REFUND_STATUS[r.status] ?? { label: r.status, color: "default" as const };
                  const isPartial = Number(r.amount) < Number(payment.amount);
                  return (
                    <Stack
                      key={r.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/tenants/${tenantId}/refunds/${payment.id}/${r.id}`)}
                    >
                      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(r.amount, payment.currency)}
                        </Typography>
                        {isPartial && (
                          <Typography variant="caption" color="text.secondary">(parcial)</Typography>
                        )}
                        <Chip label={rst.label} color={rst.color} size="small" />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(r.createdAt).toLocaleString("pt-BR")}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="primary">Ver →</Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {payment.status === "APPROVED" && payment.refunds.length === 0 && (
          <Alert severity="info">
            Nenhum reembolso registrado para este pagamento.
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
