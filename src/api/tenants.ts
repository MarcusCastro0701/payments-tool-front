import api from "./client";

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  apiKeyPrefix: string | null;
  createdAt: string;
  mercadoPago?: {
    connected: boolean;
    tokenValid: boolean;
    expiresAt: string | null;
  };
};

export const tenantsApi = {
  list: () => api.get<Tenant[]>("/tenants"),
  show: (id: number) => api.get<Tenant>(`/tenants/${id}`),
  create: (data: { name: string; slug: string }) =>
    api.post<Tenant>("/tenants", data),
};
