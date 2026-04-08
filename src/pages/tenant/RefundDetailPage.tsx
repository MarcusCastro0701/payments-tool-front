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
import { ArrowBackIosNew, OpenInNewOutlined } from "@mui/icons-material";
import { refundsApi, type Refund } from "../../api/refunds";

const REFUND_STATUS: Record<string, { label: string; color: "success" | "warning" | "error" | "default"; description: string }> = {
  approved: { label: "Aprovado",  color: "success", description: "O reembolso foi processado e o valor devolvido ao comprador." },
  pending:  { label: "Pendente",  color: "warning", description: "O reembolso foi solicitado e está sendo processado pelo Mercado Pago." },
  rejected: { label: "Rejeitado", color: "error",   description: "O reembolso foi rejeitado pelo Mercado Pago." },
};

const METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD:   "Cartão de crédito",
  DEBIT_CARD:    "Cartão de débito",
  PIX:           "PIX",
  BOLETO:        "Boleto",
  BANK_TRANSFER: "Transferência bancária",
  MERCADOPAGO:   "Mercado Pago",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Stack>
  );
}

export function RefundDetailPage() {
  const { tenantId, paymentId, refundId } = useParams<{
    tenantId: string;
    paymentId: string;
    refundId: string;
  }>();
  const navigate = useNavigate();

  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tenantId || !paymentId || !refundId) return;
    refundsApi
      .getOne(Number(tenantId), Number(paymentId), Number(refundId))
      .then((res) => setRefund(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantId, paymentId, refundId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !refund) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">Reembolso não encontrado.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}/refunds/list`)}>Voltar</Button>
      </Container>
    );
  }

  const st = REFUND_STATUS[refund.status] ?? { label: refund.status, color: "default" as const, description: "" };
  const isPanel = refund.origin === "PANEL";
  const isPartial = refund.payment && Number(refund.amount) < Number(refund.payment.amount);
  const refundTypeLabel = isPartial ? "Parcial" : "Integral";

  const formatBRL = (v: string, currency = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(v));

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate(`/tenants/${tenantId}/refunds/list`)}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Voltar à Listagem
      </Button>

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reembolso #{refund.id}</Typography>
          <Typography variant="body2" color="text.secondary">Detalhes completos do reembolso</Typography>
        </Box>
        {isPanel && <Chip label="Pagamento de teste" color="warning" size="small" variant="outlined" />}
      </Stack>

      <Stack spacing={2}>
        {isPanel && (
          <Alert severity="warning">
            Este reembolso é proveniente de um <strong>pagamento de teste</strong>. As políticas do negócio não se aplicam.
          </Alert>
        )}

        {/* Dados do reembolso */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Typography variant="h6" fontWeight={700}>{formatBRL(refund.amount)}</Typography>
                <Chip label={refundTypeLabel} size="small" color={isPartial ? "default" : "primary"} variant="outlined" />
              </Stack>
              <Chip label={st.label} color={st.color} />
            </Stack>

            {st.description && (
              <Alert
                severity={st.color === "success" ? "success" : st.color === "warning" ? "warning" : "error"}
                sx={{ mb: 2 }}
              >
                {st.description}
              </Alert>
            )}

            <Divider sx={{ mb: 2 }} />
            <Stack divider={<Divider />}>
              <Row label="ID interno" value={`#${refund.id}`} />
              <Row label="ID Mercado Pago" value={refund.mpRefundId} />
              <Row label="Pagamento associado" value={`#${refund.paymentId}`} />
              <Row label="Tipo" value={refundTypeLabel} />
              <Row label="Origem" value={isPanel ? "Área de teste" : "Site do negócio"} />
              <Row
                label="Data do reembolso"
                value={
                  new Date(refund.createdAt).toLocaleString("pt-BR") +
                  (isPanel ? " (pagamento de teste)" : "")
                }
              />
              {refund.reason && <Row label="Motivo" value={refund.reason} />}
              {isPartial && refund.payment && (
                <Row
                  label="Valor reembolsado"
                  value={`${formatBRL(refund.amount)} de ${formatBRL(refund.payment.amount, refund.payment.currency)}`}
                />
              )}
            </Stack>

            {refund.payment && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Pagamento original</Typography>
                <Stack divider={<Divider />}>
                  <Row
                    label="Valor pago"
                    value={formatBRL(refund.payment.amount, refund.payment.currency)}
                  />
                  <Row label="Método" value={METHOD_LABELS[refund.payment.method] ?? refund.payment.method} />
                  <Row label="Origem" value={refund.payment.origin === "PANEL" ? "Área de teste" : "Site do negócio"} />
                  {refund.payment.description && <Row label="Descrição" value={refund.payment.description} />}
                  {refund.payment.mpPaymentId && <Row label="ID MP do pagamento" value={refund.payment.mpPaymentId} />}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>

        {/* Link para o pagamento — abre em nova aba */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2,
            cursor: "pointer",
            borderColor: isPartial ? "primary.main" : undefined,
            "&:hover": { borderColor: "primary.main" },
          }}
          onClick={() => window.open(`/tenants/${tenantId}/payments/${refund.paymentId}`, "_blank")}
        >
          <CardContent sx={{ py: "12px !important" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {isPartial ? "Ver pagamento referente (reembolso parcial)" : "Ver pagamento referente"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pagamento #{refund.paymentId} — abre em nova aba
                </Typography>
              </Box>
              <OpenInNewOutlined fontSize="small" color="primary" />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
