import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { tenantsApi, type Tenant } from "../../api/tenants";
import axios from "axios";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: Tenant) => void;
};

export function CreateTenantDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(generateSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlugManual(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80));
  }

  function handleClose() {
    setName("");
    setSlug("");
    setSlugManual(false);
    setError(null);
    onClose();
  }

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await tenantsApi.create({ name, slug });
      onCreated(res.data);
      handleClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Erro ao criar tenant");
      } else {
        setError("Erro inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Novo Tenant</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome da conta"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            fullWidth
            autoFocus
            inputProps={{ minLength: 2, maxLength: 120 }}
          />
          <TextField
            label="Slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            fullWidth
            inputProps={{ minLength: 2, maxLength: 80 }}
            helperText="Somente letras minúsculas, números e hífens"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading || !name || !slug}
          loading={loading}
        >
          Criar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
