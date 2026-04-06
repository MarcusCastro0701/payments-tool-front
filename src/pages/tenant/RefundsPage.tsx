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
  Divider,
  FormControlLabel,
  IconButton,
  Pagination,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  AssignmentReturnOutlined,
  FilterAltOffOutlined,
  SaveOutlined,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { refundsApi, type Refund, type RefundPolicy } from "../../api/refunds";

const REFUND_STATUS: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  approved: { label: "Aprovado", color: "success" },
  pending:  { label: "Pendente", color: "warning" },
  rejected: { label: "Rejeitado", color: "error" },
};

function formatCurrency(amount: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount));
}

const PROCESSING_TIMES = [
  { method: "PIX", time: "Até 24 horas" },
  { method: "Cartão de débito", time: "5 a 10 dias úteis" },
  { method: "Cartão de crédito", time: "Até 2 faturas (30-60 dias)" },
  { method: "Boleto", time: "5 a 10 dias úteis" },
];

// ─── Componente de listagem paginada isolado ────────────────────────────────

function RefundList({ tenantId }: { tenantId: number }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(15, "day"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [showAll, setShowAll] = useState(false);
  const limit = 10;

  const fetchRefunds = useCallback((p: number, start?: Dayjs | null, end?: Dayjs | null, all?: boolean) => {
    setLoading(true);
    setError(false);
    refundsApi
      .listByTenant(tenantId, {
        page: p,
        limit,
        startDate: all ? undefined : (start ? start.startOf("day").toISOString() : undefined),
        endDate: all ? undefined : (end ? end.endOf("day").toISOString() : undefined),
      })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchRefunds(1, startDate, endDate, false);
  }, []);

  function handleFilter() {
    setShowAll(false);
    setPage(1);
    fetchRefunds(1, startDate, endDate, false);
  }

  function handleShowAll() {
    setShowAll(true);
    setPage(1);
    fetchRefunds(1, null, null, true);
  }

  function handleClearFilter() {
    const start = dayjs().subtract(15, "day");
    const end = dayjs();
    setStartDate(start);
    setEndDate(end);
    setShowAll(false);
    setPage(1);
    fetchRefunds(1, start, end, false);
  }

  function handlePageChange(_: any, value: number) {
    setPage(value);
    fetchRefunds(value, startDate, endDate, showAll);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Box>
      {/* Filtros */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
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
        <Button variant="contained" size="small" onClick={handleFilter}>
          Buscar
        </Button>
        <Button variant="outlined" size="small" startIcon={<FilterAltOffOutlined />} onClick={handleClearFilter}>
          Limpar
        </Button>
        <Button variant="text" size="small" onClick={handleShowAll}>
          Todos os reembolsos
        </Button>
      </Stack>

      {showAll && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Exibindo todos os reembolsos registrados.
        </Alert>
      )}

      {/* Lista */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Erro ao carregar reembolsos.</Alert>
      ) : items.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          Nenhum reembolso encontrado no período.
        </Typography>
      ) : (
        <>
          <Stack spacing={1.5}>
            {items.map((r) => {
              const st = REFUND_STATUS[r.status] ?? { label: r.status, color: "default" as const };
              return (
                <Card
                  key={r.id}
                  variant="outlined"
                  sx={{ borderRadius: 2, cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
                  onClick={() => navigate(`/tenants/${tenantId}/refunds/${r.paymentId}/${r.id}`)}
                >
                  <CardContent sx={{ py: "12px !important" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
                        <Typography fontWeight={700}>{formatCurrency(r.amount)}</Typography>
                        <Chip label={st.label} color={st.color} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          Pagamento #{r.paymentId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(r.createdAt).toLocaleString("pt-BR")}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="primary">
                        Ver detalhes →
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
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
    </Box>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export function RefundsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<RefundPolicy>({ maxRefundDays: 180, allowPartial: true });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    refundsApi.getPolicy(Number(tenantId)).then((res) => setPolicy(res.data)).catch(() => {});
  }, [tenantId]);

  async function handleSavePolicy() {
    if (!tenantId) return;
    setSavingPolicy(true);
    setPolicyError(null);
    setPolicySaved(false);
    try {
      await refundsApi.savePolicy(Number(tenantId), policy);
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    } catch {
      setPolicyError("Erro ao salvar políticas. Tente novamente.");
    } finally {
      setSavingPolicy(false);
    }
  }

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
          <AssignmentReturnOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Reembolsos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie e acompanhe os reembolsos do seu negócio
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={3}>
          {/* Tabela de prazos */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Prazo estimado por método de pagamento
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Método</strong></TableCell>
                    <TableCell><strong>Prazo estimado para o comprador receber</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {PROCESSING_TIMES.map((row) => (
                    <TableRow key={row.method}>
                      <TableCell>{row.method}</TableCell>
                      <TableCell>{row.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Políticas de reembolso */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Políticas de reembolso do negócio
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Estas políticas se aplicam <strong>exclusivamente</strong> a pagamentos realizados pelos clientes
                do seu site via API. Pagamentos feitos na área de teste do painel seguem regras próprias
                e não são afetados por estas configurações.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Sobre reembolsos de teste (área de pagamento do painel):
                </Typography>
                <Typography variant="body2">
                  • Reembolsos de teste só funcionam com pagamentos realizados na área de teste deste painel.<br />
                  • Podem ser solicitados em até <strong>180 dias</strong> após o pagamento — limite técnico do Mercado Pago.<br />
                  • São sempre <strong>integrais</strong> (reembolso total do valor pago).<br />
                  • As políticas configuradas abaixo <strong>não se aplicam</strong> a eles.
                </Typography>
              </Alert>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2} maxWidth={400}>
                <TextField
                  label="Prazo máximo para reembolso (dias)"
                  type="number"
                  size="small"
                  value={policy.maxRefundDays}
                  onChange={(e) => setPolicy((p) => ({ ...p, maxRefundDays: Number(e.target.value) }))}
                  inputProps={{ min: 1, max: 180 }}
                  helperText="Entre 1 e 180 dias. O Mercado Pago não aceita reembolsos após 180 dias."
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={policy.allowPartial}
                      onChange={(e) => setPolicy((p) => ({ ...p, allowPartial: e.target.checked }))}
                    />
                  }
                  label="Permitir reembolso parcial"
                />
                {policyError && <Alert severity="error">{policyError}</Alert>}
                {policySaved && <Alert severity="success">Políticas salvas com sucesso.</Alert>}
                <Box>
                  <Button
                    variant="contained"
                    startIcon={savingPolicy ? <CircularProgress size={16} /> : <SaveOutlined />}
                    disabled={savingPolicy}
                    onClick={handleSavePolicy}
                  >
                    Salvar políticas
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Listagem de reembolsos */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Listagem de reembolsos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {tenantId && <RefundList tenantId={Number(tenantId)} />}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </LocalizationProvider>
  );
}
