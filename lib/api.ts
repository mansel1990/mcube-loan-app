import { BASE_URL } from "@/constants/config";
import { getSessionToken, signOut } from "./auth";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = await getSessionToken();
  const { method = "GET", body } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    await signOut();
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(errBody.message || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
