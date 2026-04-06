import { useCallback, useEffect, useState } from "react";
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  FilterAltOffOutlined,
  FilterAltOutlined,
  ReceiptLongOutlined,
  AssignmentReturn,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { tenantsApi, type PaymentItem } from "../../api/tenants";
import { refundsApi } from "../../api/refunds";

const STATUS_CONFIG: Record<string, {
  label: string;
  borderColor: string;
  chipColor: "success" | "warning" | "error" | "default";
}> = {
  APPROVED: { label: "Aprovado",    borderColor: "#22C55E", chipColor: "success" },
  PENDING:  { label: "Pendente",    borderColor: "#EAB308", chipColor: "warning" },
  DECLINED: { label: "Recusado",    borderColor: "#EF4444", chipColor: "error"   },
  CANCELED: { label: "Cancelado",   borderColor: "#EF4444", chipColor: "error"   },
  REFUNDED: { label: "Reembolsado", borderColor: "#000000", chipColor: "default" },
};

const METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD:   "Cartão de crédito",
  DEBIT_CARD:    "Cartão de débito",
  PIX:           "PIX",
  BOLETO:        "Boleto",
  BANK_TRANSFER: "Transferência",
  MERCADOPAGO:   "Mercado Pago",
};

function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount));
}

function InstallmentsLabel({ metadata }: { metadata: any }) {
  const installments = metadata?.installments;
  if (!installments || installments <= 1) return null;
  return (
    <Typography variant="caption" color="text.secondary">
      {installments}x
    </Typography>
  );
}

// ─── Dialog de reembolso ────────────────────────────────────────────────────

function RefundDialog({
  open,
  payment,
  tenantId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  payment: PaymentItem | null;
  tenantId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPartial(false);
    setAmount("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!payment) return;
    setLoading(true);
    setError(null);
    try {
      await refundsApi.create(
        tenantId,
        payment.id,
        partial && amount ? Number(amount) : undefined
      );
      handleClose();
      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Erro ao processar reembolso.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!payment) return null;
  const maxAmount = Number(payment.amount);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Solicitar Reembolso</DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>
          Pagamento #{payment.id} — {formatCurrency(payment.amount, payment.currency)}
        </DialogContentText>
        <Stack spacing={2} mt={1}>
          <Stack direction="row" gap={1}>
            <Button
              variant={!partial ? "contained" : "outlined"}
              size="small"
              onClick={() => setPartial(false)}
            >
              Total
            </Button>
            <Button
              variant={partial ? "contained" : "outlined"}
              size="small"
              onClick={() => setPartial(true)}
            >
              Parcial
            </Button>
          </Stack>
          {partial && (
            <TextField
              label="Valor do reembolso"
              size="small"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{ min: 0.01, max: maxAmount, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText={`Máximo: ${formatCurrency(payment.amount, payment.currency)}`}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading || (partial && (!amount || Number(amount) <= 0))}
          onClick={handleConfirm}
        >
          {loading ? <CircularProgress size={18} /> : "Confirmar reembolso"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Card de pagamento ──────────────────────────────────────────────────────

function PaymentCard({
  payment,
  tenantId,
  onRefunded,
}: {
  payment: PaymentItem;
  tenantId: number;
  onRefunded: () => void;
}) {
  const navigate = useNavigate();
  const [refundOpen, setRefundOpen] = useState(false);
  const config = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING;
  const isApproved = payment.status === "APPROVED";
  const hasPendingRefund = payment.refunds?.some((r) => r.status === "pending");

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: config.borderColor,
          borderWidth: 1.5,
          cursor: "pointer",
          "&:hover": { borderColor: "primary.main" },
        }}
        onClick={() => navigate(`/tenants/${tenantId}/payments/${payment.id}`)}
      >
        <CardContent sx={{ pb: "12px !important" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
              {hasPendingRefund && (
                <Typography variant="caption" fontWeight={800} letterSpacing={1} color="warning.main">
                  REEMBOLSO EM PROCESSAMENTO
                </Typography>
              )}
              <Typography variant="body1" fontWeight={700}>
                #{payment.id}
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatCurrency(payment.amount, payment.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {METHOD_LABELS[payment.method] ?? payment.method}
              </Typography>
              <InstallmentsLabel metadata={payment.metadata} />
              <Chip label={config.label} color={config.chipColor} size="small" sx={{ fontWeight: 600 }} />
              <Typography variant="body2" color="text.secondary">
                {new Date(payment.createdAt).toLocaleString("pt-BR")}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" gap={0.5}>
              {isApproved && (
                <Tooltip title="Solicitar reembolso">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setRefundOpen(true); }}
                  >
                    <AssignmentReturn fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <RefundDialog
        open={refundOpen}
        payment={payment}
        tenantId={tenantId}
        onClose={() => setRefundOpen(false)}
        onSuccess={onRefunded}
      />
    </>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export function PaymentsListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const fetchPayments = useCallback((start?: Dayjs | null, end?: Dayjs | null) => {
    if (!tenantId) return;
    setLoading(true);
    setError(false);
    tenantsApi
      .listPayments(Number(tenantId), {
        startDate: start ? start.startOf("day").toISOString() : undefined,
        endDate: end ? end.endOf("day").toISOString() : undefined,
        page: 1,
      })
      .then((res) => {
        setPayments(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const hasFilter = !!startDate || !!endDate;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/tenants/${tenantId}`)}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Voltar ao Tenant
        </Button>

        <Stack direction="row" alignItems="center" gap={2} mb={4}>
          <ReceiptLongOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Pagamentos</Typography>
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              </Typography>
            )}
          </Box>
        </Stack>

        <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <FilterAltOutlined fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={600}>Filtrar por data</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
              <DatePicker
                label="De"
                value={startDate}
                onChange={setStartDate}
                maxDate={endDate ?? undefined}
                slotProps={{ textField: { size: "small" } }}
              />
              <DatePicker
                label="Até"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate ?? undefined}
                slotProps={{ textField: { size: "small" } }}
              />
              <Button variant="contained" size="small" onClick={() => fetchPayments(startDate, endDate)}>
                Buscar
              </Button>
              {hasFilter && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterAltOffOutlined />}
                  onClick={() => { setStartDate(null); setEndDate(null); fetchPayments(null, null); }}
                >
                  Limpar
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Erro ao carregar pagamentos.</Alert>
        ) : payments.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary">
              {hasFilter ? "Nenhum pagamento no período selecionado." : "Nenhum pagamento registrado ainda."}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {payments.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                tenantId={Number(tenantId)}
                onRefunded={() => fetchPayments(startDate, endDate)}
              />
            ))}
          </Stack>
        )}
      </Container>
    </LocalizationProvider>
  );
}
