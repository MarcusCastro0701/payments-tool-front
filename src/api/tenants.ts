import api from "./client";

export type PaymentItem = {
  id: number;
  status: string;
  amount: string;
  currency: string;
  method: string;
  origin: string;
  description: string | null;
  metadata: any;
  externalId: string | null;
  initPoint: string | null;
  mpPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  refunds: Array<{ id: number; status: string }>;
};

export type PaymentDetail = {
  id: number;
  status: string;
  amount: string;
  currency: string;
  method: string;
  origin: string;
  description: string | null;
  metadata: any;
  externalId: string | null;
  initPoint: string | null;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  refunds: Array<{
    id: number;
    mpRefundId: string;
    amount: string;
    status: string;
    reason: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type PaymentList = {
  items: PaymentItem[];
  total: number;
  page: number;
  limit: number;
};

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
    publicKey: string | null;
  };
};

export const tenantsApi = {
  list: () => api.get<Tenant[]>("/tenants"),
  show: (id: number) => api.get<Tenant>(`/tenants/${id}`),
  create: (data: { name: string; slug: string }) =>
    api.post<Tenant>("/tenants", data),
  getMpConnectUrl: (tenantId: number) =>
    api.get<{ url: string }>(`/mp/connect/url?tenantId=${tenantId}`),
  rotateApiKey: (tenantId: number) =>
    api.post<{ apiKey: string; apiKeyPrefix: string }>(`/tenants/${tenantId}/api-key/rotate`),
  createPreference: (tenantId: number, data?: { amount?: number; title?: string; description?: string; category?: string }) =>
    api.post<{ paymentId: number; initPoint: string | null }>(
      `/tenants/${tenantId}/preference`,
      data ?? {}
    ),
  listPayments: (tenantId: number, params?: { startDate?: string; endDate?: string; page?: number; origin?: string }) =>
    api.get<PaymentList>(`/tenants/${tenantId}/payments`, { params }),
  showPayment: (tenantId: number, paymentId: number) =>
    api.get<PaymentDetail>(`/tenants/${tenantId}/payments/${paymentId}`),
  syncPayment: (tenantId: number, paymentId: number) =>
    api.post<PaymentDetail>(`/tenants/${tenantId}/payments/${paymentId}/sync`),
  processPayment: (tenantId: number, data: { formData: any; amount: number; description?: string }) =>
    api.post<{ id: number; mpStatus: string; mpStatusDetail: string; status: string; amount: number }>(
      `/tenants/${tenantId}/process-payment`,
      data
    ),
};
