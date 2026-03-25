import api from "./client";

export type SignupPayload = {
  user: { name: string; email: string; phone?: string; password: string };
  tenant: { name: string; slug: string };
};

export type SigninPayload = {
  email: string;
  password: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

export const authApi = {
  signup: (data: SignupPayload) => api.post("/auth/sign-up", data),
  signin: (data: SigninPayload) => api.post<{ token: string }>("/auth/sign-in", data),
  me: () => api.get<User>("/auth/me"),
  logout: () => api.delete("/auth/logout"),
};
