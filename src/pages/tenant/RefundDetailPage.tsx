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
import { ArrowBackIosNew } from "@mui/icons-material";
import { refundsApi, type Refund } from "../../api/refunds";

const REFUND_STATUS: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  approved: { label: "Aprovado", color: "success" },
  pending:  { label: "Pendente", color: "warning" },
  rejected: { label: "Rejeitado", color: "error" },
};

const METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD:  "Cartão de crédito",
  DEBIT_CARD:   "Cartão de débito",
  PIX:          "PIX",
  BOLETO:       "Boleto",
  BANK_TRANSFER:"Transferência bancária",
  MERCADOPAGO:  "Mercado Pago",
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
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/tenants/${tenantId}/refunds`)}>Voltar</Button>
      </Container>
    );
  }

  const st = REFUND_STATUS[refund.status] ?? { label: refund.status, color: "default" as const };
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(refund.amount));
  const isPartial = refund.payment && Number(refund.amount) < Number(refund.payment.amount);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
        onClick={() => navigate(`/tenants/${tenantId}/refunds`)}
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Voltar aos Reembolsos
      </Button>

      <Stack direction="row" alignItems="center" gap={2} mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Reembolso #{refund.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detalhes completos do reembolso
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={700}>{amount}</Typography>
              {isPartial && (
                <Chip label="Parcial" size="small" variant="outlined" />
              )}
            </Stack>
            <Chip label={st.label} color={st.color} />
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack divider={<Divider />}>
            <Row label="ID interno" value={`#${refund.id}`} />
            <Row label="ID Mercado Pago" value={refund.mpRefundId} />
            <Row label="Pagamento associado" value={`#${refund.paymentId}`} />
            <Row label="Data do reembolso" value={new Date(refund.createdAt).toLocaleString("pt-BR")} />
            {refund.reason && <Row label="Motivo" value={refund.reason} />}
          </Stack>

          {refund.payment && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Pagamento original
              </Typography>
              <Stack divider={<Divider />}>
                <Row
                  label="Valor pago"
                  value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: refund.payment.currency }).format(Number(refund.payment.amount))}
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
    </Container>
  );
}
