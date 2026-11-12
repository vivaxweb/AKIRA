"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, LoginResponse, Role } from "@/types";
import {
  apiClient,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  hasRole: (...roles: Role[]) => boolean;
  isFacultyLike: () => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = React.useCallback(async (): Promise<User | null> => {
    try {
      const data = await apiClient<User>("/auth/me/");
      setUser(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user", JSON.stringify(data));
      }
      return data;
    } catch {
      setUser(null);
      clearTokens();
      return null;
    }
  }, []);

  // Initialize on mount
  React.useEffect(() => {
    async function initAuth() {
      const refresh = getRefreshToken();
      if (!refresh) {
        setIsLoading(false);
        return;
      }

      // Try reading cached user first for instant UI response
      try {
        const cached = localStorage.getItem("auth_user");
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } catch {
        // ignore cache read failure
      }

      await fetchProfile();
      setIsLoading(false);
    }

    initAuth();
  }, [fetchProfile]);

  // Route protection
  React.useEffect(() => {
    if (isLoading) return;

    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/404" || pathname === "/403";

    if (!user && !isPublicPage) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(res.access);
    setRefreshToken(res.refresh);

    // Fetch full profile immediately
    const profile = await fetchProfile();
    const finalUser = profile || (res.user as unknown as User);
    setUser(finalUser);
    router.push("/dashboard");
    return finalUser;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    router.push("/login");
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isFacultyLike = () => {
    if (!user) return false;
    return user.role === "FACULTY" || user.role === "COORDINATOR" || user.role === "HOD" || user.role === "PRINCIPAL";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser: fetchProfile,
        hasRole,
        isFacultyLike,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
