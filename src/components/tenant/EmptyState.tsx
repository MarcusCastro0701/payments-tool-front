import { Box, Button, Typography } from "@mui/material";
import { Add, StorefrontOutlined } from "@mui/icons-material";

export function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={10}
      gap={2}
    >
      <StorefrontOutlined sx={{ fontSize: 64, color: "text.disabled" }} />
      <Typography variant="h6" color="text.secondary" fontWeight={600}>
        Você ainda não tem nenhum tenant
      </Typography>
      <Typography variant="body2" color="text.disabled">
        Crie um tenant para começar a usar a plataforma
      </Typography>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={onNew}
        sx={{ mt: 1, borderRadius: 2 }}
      >
        Criar primeiro tenant
      </Button>
    </Box>
  );
}
