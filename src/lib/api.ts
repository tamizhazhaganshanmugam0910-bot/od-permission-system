import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    headers,
  });
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: "GET" }),
  post: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: "DELETE" }),
};
