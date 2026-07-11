"use client";

import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";

const TOKEN_KEY = "ygverse_token";

type User = { username: string; regNo: string };

type AuthContextValue = {
  /** null = logged out; string = session token passed to every Convex call */
  token: string | null;
  user: User | null;
  /** true until localStorage has been read and (if a token exists) me() resolved */
  loading: boolean;
  login: (
    regNo: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [storageRead, setStorageRead] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);
  // undefined = loading, null = invalid/expired session
  const me = useQuery(api.auth.me, token ? { token } : "skip");

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setStorageRead(true);
  }, []);

  // Session turned out to be invalid or expired: clear it
  useEffect(() => {
    if (token && me === null) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }
  }, [token, me]);

  const loading = !storageRead || (token !== null && me === undefined);
  const user = token && me ? me : null;

  // Route guard
  useEffect(() => {
    if (loading) return;
    if (!token && pathname !== "/login") router.replace("/login");
    if (token && pathname === "/login") router.replace("/photos");
  }, [loading, token, pathname, router]);

  const login = async (regNo: string, password: string) => {
    const result = await loginMutation({ regNo, password });
    if (result.success) {
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      return { success: true };
    }
    return { success: false, message: result.message };
  };

  const logout = () => {
    if (token) logoutMutation({ token }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
