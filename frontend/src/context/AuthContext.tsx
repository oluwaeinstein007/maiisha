"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await api.get<User>("/api/user");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, mutate } = useSWR<User | null>("/api/user", fetchCurrentUser);

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<{ user: User }>("/api/auth/login", { email, password });
      await mutate(data.user, false);
      return data.user;
    },
    [mutate],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await api.post<{ user: User }>("/api/auth/register", payload);
      await mutate(data.user, false);
      return data.user;
    },
    [mutate],
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    await mutate(null, false);
  }, [mutate]);

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, loading: isLoading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
