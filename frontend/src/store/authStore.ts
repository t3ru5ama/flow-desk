import { create } from "zustand";
import { decodeJwt } from "../lib/jwt";
import type { Organization, Role, User } from "../types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  org: Organization | null;
  role: Role | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (accessToken: string, user: User, org: Organization) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  setBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  org: null,
  role: null,
  isAuthenticated: false,
  isBootstrapping: true,
  setSession: (accessToken, user, org) =>
    set({ accessToken, user, org, role: decodeJwt(accessToken)?.role ?? null, isAuthenticated: true, isBootstrapping: false }),
  setAccessToken: (accessToken) =>
    set((s) => ({ accessToken, role: decodeJwt(accessToken)?.role ?? s.role, isAuthenticated: true })),
  logout: () =>
    set({ accessToken: null, user: null, org: null, role: null, isAuthenticated: false, isBootstrapping: false }),
  setBootstrapped: () => set({ isBootstrapping: false }),
}));
