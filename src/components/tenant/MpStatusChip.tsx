import { Chip } from "@mui/material";

type MpStatus = {
  connected: boolean;
  tokenValid: boolean;
  expiresAt: string | null;
};

export function MpStatusChip({ mp }: { mp: MpStatus }) {
  if (mp.connected && mp.tokenValid) {
    return <Chip label="Ativo" color="success" size="small" />;
  }
  if (mp.connected && !mp.tokenValid) {
    return (
      <Chip
        label="Token expirado"
        size="small"
        sx={{ bgcolor: "#D97706", color: "#fff", fontWeight: 600 }}
      />
    );
  }
  return (
    <Chip
      label="Autorização pendente"
      size="small"
      sx={{ bgcolor: "#E2E8F0", color: "#64748B" }}
    />
  );
}
