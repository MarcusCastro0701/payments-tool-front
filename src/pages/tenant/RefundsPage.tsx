import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
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
  FormatListBulletedOutlined,
  SaveOutlined,
} from "@mui/icons-material";
import { refundsApi, type RefundPolicy } from "../../api/refunds";

const PROCESSING_TIMES = [
  { method: "PIX", time: "Até 24 horas" },
  { method: "Cartão de débito", time: "5 a 10 dias úteis" },
  { method: "Cartão de crédito", time: "Até 2 faturas (30-60 dias)" },
  { method: "Boleto", time: "5 a 10 dias úteis" },
];

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
          <Typography variant="h5" fontWeight={700}>Reembolsos</Typography>
          <Typography variant="body2" color="text.secondary">
            Configurações e listagem de reembolsos do seu negócio
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3}>
        {/* Acesso rápido à listagem */}
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "primary.main", borderWidth: 1.5 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Listagem de reembolsos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Consulte, filtre e acompanhe todos os reembolsos registrados
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<FormatListBulletedOutlined />}
                onClick={() => navigate(`/tenants/${tenantId}/refunds/list`)}
              >
                Listagem de reembolsos
              </Button>
            </Stack>
          </CardContent>
        </Card>

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
              do seu site via API. Pagamentos feitos na área de teste do painel seguem regras próprias.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Sobre reembolsos de teste (área de pagamento do painel):
              </Typography>
              <Typography variant="body2">
                • Podem ser solicitados em até <strong>180 dias</strong> — limite técnico do Mercado Pago.<br />
                • São sempre <strong>integrais</strong>.<br />
                • As políticas abaixo <strong>não se aplicam</strong> a eles.
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
                helperText="Entre 1 e 180 dias."
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
      </Stack>
    </Container>
  );
}
