import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../api/auth";
import axios from "axios";

type Mode = "login" | "signup";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handlePhoneChange(val: string) {
    setPhone(formatPhone(val));
  }

  function handleTenantNameChange(val: string) {
    setTenantName(val);
    if (!slugManual) setTenantSlug(generateSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlugManual(true);
    setTenantSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.signin({ email, password });
      await login(res.data.token);
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Credenciais inválidas");
      } else {
        setError("Erro inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.signup({
        user: { name, email, phone: phone || undefined, password },
        tenant: { name: tenantName, slug: tenantSlug },
      });
      await login((res.data as any).token);
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data;
        if (detail?.details?.fields) {
          setError(detail.details.fields.join(" | "));
        } else {
          setError(detail?.message ?? "Erro ao criar conta");
        }
      } else {
        setError("Erro inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card sx={{ width: "100%", maxWidth: 440, borderRadius: 3 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={0.5}>
            PaymentsSaaS
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            {mode === "login" ? "Entre na sua conta" : "Crie sua conta gratuitamente"}
          </Typography>

          {/* Mode toggle */}
          <Box display="flex" bgcolor="action.hover" borderRadius={2} p={0.5} mb={3}>
            {(["login", "signup"] as Mode[]).map((m) => (
              <Button
                key={m}
                fullWidth
                size="small"
                variant={mode === m ? "contained" : "text"}
                disableElevation
                onClick={() => switchMode(m)}
                sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600 }}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </Button>
            ))}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {mode === "login" ? (
            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2}>
                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  loading={loading}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Entrar
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSignup}>
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Dados pessoais
                </Typography>
                <TextField
                  label="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                  autoComplete="name"
                  inputProps={{ minLength: 3, maxLength: 100 }}
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Telefone"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  fullWidth
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  inputProps={{ maxLength: 15 }}
                />
                <TextField
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  inputProps={{ minLength: 6 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Divider />

                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Seu negócio
                </Typography>
                <TextField
                  label="Nome da conta / empresa"
                  value={tenantName}
                  onChange={(e) => handleTenantNameChange(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ minLength: 2, maxLength: 120 }}
                  helperText="Como sua conta aparecerá na plataforma"
                />
                <TextField
                  label="Identificador (slug)"
                  value={tenantSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ minLength: 2, maxLength: 80 }}
                  helperText="Somente letras minúsculas, números e hífens"
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  loading={loading}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Criar conta
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
