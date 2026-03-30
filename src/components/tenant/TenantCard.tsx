import { Card, CardActionArea, CardContent, Stack, Tooltip, Typography } from "@mui/material";
import { InfoOutlined, StorefrontOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { type Tenant } from "../../api/tenants";
import { MpStatusChip } from "./MpStatusChip";

export function TenantCard({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate();

  return (
    <Card sx={{ borderRadius: 2, height: "100%" }} variant="outlined">
      <CardActionArea sx={{ height: "100%" }} onClick={() => navigate(`/tenants/${tenant.id}`)}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <StorefrontOutlined color="primary" />
            <MpStatusChip mp={tenant.mercadoPago ?? { connected: false, tokenValid: false, expiresAt: null }} />
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.5}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {tenant.name}
            </Typography>
            {!tenant.mercadoPago?.connected && (
              <Tooltip title="O tenant ainda não possui nenhuma conexão com o Mercado Pago">
                <InfoOutlined sx={{ fontSize: 16, color: "warning.main", cursor: "default", flexShrink: 0 }} />
              </Tooltip>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            /{tenant.slug}
          </Typography>

          {tenant.apiKeyPrefix && (
            <Typography variant="caption" color="text.disabled" display="block" mt={1}>
              API Key: {tenant.apiKeyPrefix}...
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
