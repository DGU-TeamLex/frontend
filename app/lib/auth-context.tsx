"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "./api";

export type Role = "CENTRAL" | "INSTITUTION";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  institutionId: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = "wep-stock-auth";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 새로고침 시 localStorage 에서 세션 복원 (서버 컴포넌트가 아니라 클라이언트에서만 접근 가능)
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setToken(parsed.token);
        setUser(parsed.user);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? `로그인 실패 (HTTP ${res.status})`);
    }
    const data = await res.json();
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.accessToken, user: data.user }));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 AuthProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}

// getJSON(app/lib/api.ts) 이 훅 바깥(일반 함수)에서도 토큰을 읽을 수 있도록
// localStorage 를 직접 조회하는 헬퍼. AuthProvider state 와 이중 관리처럼
// 보이지만, api.ts 는 React 트리 바깥에서도 호출되므로 Context 를 쓸 수 없다.
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).token ?? null;
  } catch {
    return null;
  }
}
