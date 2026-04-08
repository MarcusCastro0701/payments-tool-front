import api from "./client";

export type Refund = {
  id: number;
  paymentId: number;
  mpRefundId: string;
  amount: string;
  status: string;
  origin: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: {
    id: number;
    amount: string;
    currency: string;
    method: string;
    origin: string;
    mpPaymentId: string | null;
    description: string | null;
  };
};

export type RefundList = {
  items: Refund[];
  total: number;
  page: number;
  limit: number;
};

export type RefundPolicy = {
  maxRefundDays: number;
  allowPartial: boolean;
};

export const refundsApi = {
  create: (tenantId: number, paymentId: number, amount?: number) =>
    api.post<Refund>(`/tenants/${tenantId}/payments/${paymentId}/refund`, amount !== undefined ? { amount } : {}),

  listByPayment: (tenantId: number, paymentId: number) =>
    api.get<Refund[]>(`/tenants/${tenantId}/payments/${paymentId}/refunds`),

  getOne: (tenantId: number, paymentId: number, refundId: number) =>
    api.get<Refund>(`/tenants/${tenantId}/payments/${paymentId}/refunds/${refundId}`),

  listByTenant: (tenantId: number, params?: { startDate?: string; endDate?: string; page?: number; limit?: number; origin?: string }) =>
    api.get<RefundList>(`/tenants/${tenantId}/refunds`, { params }),

  getPolicy: (tenantId: number) =>
    api.get<RefundPolicy>(`/tenants/${tenantId}/refund-policy`),

  savePolicy: (tenantId: number, data: RefundPolicy) =>
    api.put<RefundPolicy>(`/tenants/${tenantId}/refund-policy`, data),
};
