/**
 * API client with Bearer JWT auth, automatic token refresh, and structured error handling.
 */
import { ApiError } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Memory storage for access token (per section 8.3 & AMP-007)
let memoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("refresh_token", token);
  } else {
    localStorage.removeItem("refresh_token");
  }
}

export function clearTokens() {
  memoryAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
  }
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setAccessToken(data.access);
    if (data.refresh) {
      setRefreshToken(data.refresh);
    }
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const headers = new Headers(options.headers || {});

  // Add JSON content type unless FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach access token if present
  if (memoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${memoryAccessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw {
      detail: `Backend server unreachable at ${url}. Please ensure the Django backend is running at http://127.0.0.1:8000. (${errorMsg})`,
      code: "backend_unreachable",
    } as ApiError;
  }

  // Handle 401 with silent refresh
  if (response.status === 401 && !endpoint.includes("/auth/login/") && !endpoint.includes("/auth/refresh/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      if (newToken) {
        onRefreshed(newToken);
      } else {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    // Wait for ongoing refresh
    if (isRefreshing) {
      const retryToken = await new Promise<string>((resolve) => {
        refreshSubscribers.push(resolve);
      });
      headers.set("Authorization", `Bearer ${retryToken}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        detail: `HTTP error ${response.status}: ${response.statusText}`,
        code: `http_${response.status}`,
      };
    }
    throw errorData;
  }

  // For 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
  download: async (endpoint: string, filename: string): Promise<void> => {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = new Headers();
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    let res = await fetch(url, { headers });
    if (res.status === 401) {
      const retryToken = await refreshAccessToken();
      if (retryToken) {
        headers.set("Authorization", `Bearer ${retryToken}`);
        res = await fetch(url, { headers });
      }
    }
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};
