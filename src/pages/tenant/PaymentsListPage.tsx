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
  MenuItem,
  Pagination,
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
import dayjs, { Dayjs } from "dayjs";
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

const ORIGIN_OPTIONS = [
  { value: "",         label: "Todos" },
  { value: "PANEL",    label: "Painel de teste" },
  { value: "CHECKOUT", label: "Seu negócio" },
];

const LIMIT = 10;

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
  const isPanel = payment.origin === "PANEL";

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
              <Typography variant="body1" fontWeight={700}>#{payment.id}</Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatCurrency(payment.amount, payment.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {METHOD_LABELS[payment.method] ?? payment.method}
              </Typography>
              <InstallmentsLabel metadata={payment.metadata} />
              <Chip label={config.label} color={config.chipColor} size="small" sx={{ fontWeight: 600 }} />
              {isPanel && (
                <Chip label="Teste" size="small" variant="outlined" color="warning" />
              )}
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, "day"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [origin, setOrigin] = useState("");

  const fetchPayments = useCallback((
    p: number,
    start: Dayjs | null,
    end: Dayjs | null,
    orig: string,
  ) => {
    if (!tenantId) return;
    setLoading(true);
    setError(false);
    tenantsApi
      .listPayments(Number(tenantId), {
        page: p,
        startDate: start ? start.startOf("day").toISOString() : undefined,
        endDate: end ? end.endOf("day").toISOString() : undefined,
        origin: orig || undefined,
      })
      .then((res) => {
        setPayments(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchPayments(1, startDate, endDate, origin);
  }, [fetchPayments]);

  function handleFilter() {
    setPage(1);
    fetchPayments(1, startDate, endDate, origin);
  }

  function handleClearFilter() {
    const start = dayjs().subtract(7, "day");
    const end = dayjs();
    setStartDate(start);
    setEndDate(end);
    setOrigin("");
    setPage(1);
    fetchPayments(1, start, end, "");
  }

  function handlePageChange(_: any, value: number) {
    setPage(value);
    fetchPayments(value, startDate, endDate, origin);
  }

  const totalPages = Math.ceil(total / LIMIT);

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
                {total} registro{total !== 1 ? "s" : ""}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* Filtros */}
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <FilterAltOutlined fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={600}>Filtros</Typography>
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
              <TextField
                select
                label="Origem"
                size="small"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                sx={{ minWidth: 160 }}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                {ORIGIN_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" size="small" onClick={handleFilter}>
                Buscar
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterAltOffOutlined />}
                onClick={handleClearFilter}
              >
                Limpar
              </Button>
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
            <Typography color="text.secondary">Nenhum pagamento encontrado.</Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={1.5}>
              {payments.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  tenantId={Number(tenantId)}
                  onRefunded={() => fetchPayments(page, startDate, endDate, origin)}
                />
              ))}
            </Stack>

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
}
