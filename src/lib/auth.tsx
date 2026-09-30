import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api, tokenStore, type PublicUser } from "./api";

interface AuthState {
  user: PublicUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = tokenStore.getUser();
    if (stored) setUser(stored);
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { accessToken, user: u } = await api.login({ email, password });
    tokenStore.set(accessToken, u);
    setUser(u);
  }, []);

  const signUp = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => {
      const { accessToken, user: u } = await api.register(input);
      tokenStore.set(accessToken, u);
      setUser(u);
    },
    [],
  );

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    void navigate({ to: "/login" });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut }),
    [user, ready, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Client-side guard: the API is the real authority, this only steers the UI. */
export function useRequireAuth() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !user) void navigate({ to: "/login" });
  }, [ready, user, navigate]);
  return { user, ready };
}
