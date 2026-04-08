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
  MenuItem,
  Pagination,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBackIosNew,
  AssignmentReturnOutlined,
  FilterAltOffOutlined,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { refundsApi, type Refund } from "../../api/refunds";

const REFUND_STATUS: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  approved: { label: "Aprovado", color: "success" },
  pending:  { label: "Pendente", color: "warning" },
  rejected: { label: "Rejeitado", color: "error" },
};

const ORIGIN_OPTIONS = [
  { value: "",         label: "Todos" },
  { value: "PANEL",    label: "Painel de teste" },
  { value: "CHECKOUT", label: "Seu negócio" },
];

function formatCurrency(amount: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount));
}

const LIMIT = 10;

export function RefundsListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, "day"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [origin, setOrigin] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchRefunds = useCallback((
    p: number,
    start: Dayjs | null,
    end: Dayjs | null,
    all: boolean,
    orig: string,
  ) => {
    if (!tenantId) return;
    setLoading(true);
    setError(false);
    refundsApi
      .listByTenant(Number(tenantId), {
        page: p,
        limit: LIMIT,
        startDate: all ? undefined : (start ? start.startOf("day").toISOString() : undefined),
        endDate: all ? undefined : (end ? end.endOf("day").toISOString() : undefined),
        origin: orig || undefined,
      })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchRefunds(1, startDate, endDate, false, origin);
  }, []);

  function handleFilter() {
    setShowAll(false);
    setPage(1);
    fetchRefunds(1, startDate, endDate, false, origin);
  }

  function handleShowAll() {
    setShowAll(true);
    setPage(1);
    fetchRefunds(1, null, null, true, origin);
  }

  function handleClearFilter() {
    const start = dayjs().subtract(7, "day");
    const end = dayjs();
    setStartDate(start);
    setEndDate(end);
    setOrigin("");
    setShowAll(false);
    setPage(1);
    fetchRefunds(1, start, end, false, "");
  }

  function handlePageChange(_: any, value: number) {
    setPage(value);
    fetchRefunds(value, startDate, endDate, showAll, origin);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIosNew sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/tenants/${tenantId}/refunds`)}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Voltar
        </Button>

        <Stack direction="row" alignItems="center" gap={2} mb={4}>
          <AssignmentReturnOutlined color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Listagem de reembolsos</Typography>
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
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={2}>
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
                slotProps={{
                  inputLabel: { shrink: true },
                  select: { displayEmpty: true }   // 👈 adicionar isso
                }}
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
              <Button variant="text" size="small" onClick={handleShowAll}>
                Todos os reembolsos
              </Button>
            </Stack>
            {showAll && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Exibindo todos os reembolsos registrados.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Lista */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Erro ao carregar reembolsos.</Alert>
        ) : items.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary">Nenhum reembolso encontrado.</Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={1.5}>
              {items.map((r) => {
                const st = REFUND_STATUS[r.status] ?? { label: r.status, color: "default" as const };
                const isPanel = r.origin === "PANEL";
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
                          {isPanel && (
                            <Chip label="Reembolso de teste" size="small" variant="outlined" color="warning" />
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Pagamento #{r.paymentId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(r.createdAt).toLocaleString("pt-BR")}
                            
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="primary">Ver detalhes →</Typography>
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
      </Container>
    </LocalizationProvider>
  );
}
