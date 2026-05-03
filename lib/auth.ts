import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { BASE_URL } from "@/constants/config";

const SESSION_TOKEN_KEY = "mcube_session_token";
const SESSION_COOKIE_KEY = "mcube_session_cookie";

// better-auth uses __Secure- prefix when baseURL is HTTPS
const COOKIE_NAME = BASE_URL.startsWith("https://")
  ? "__Secure-better-auth.session_token"
  : "better-auth.session_token";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": BASE_URL,
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || "Invalid email or password");
  }

  const token = body?.token;
  if (!token) throw new Error("No session token returned from server");

  await storage.set(SESSION_TOKEN_KEY, token);

  // Try to get the exact cookie name from the Set-Cookie response header.
  // On Android this typically works; on iOS NSURLSession may consume it.
  const setCookieHeader = res.headers.get("set-cookie");
  let cookieToStore: string;
  if (setCookieHeader) {
    const pair = setCookieHeader.split(";")[0].trim();
    cookieToStore = pair.includes("=") ? pair : `${COOKIE_NAME}=${token}`;
  } else {
    cookieToStore = `${COOKIE_NAME}=${token}`;
  }
  await storage.set(SESSION_COOKIE_KEY, cookieToStore);
}

export async function getSessionToken(): Promise<string | null> {
  return storage.get(SESSION_TOKEN_KEY);
}

// backward-compatible alias used by _layout.tsx
export async function getSessionCookie(): Promise<string | null> {
  return storage.get(SESSION_TOKEN_KEY);
}

export async function getCookieHeader(): Promise<string | null> {
  const stored = await storage.get(SESSION_COOKIE_KEY);
  if (stored) return stored;
  // Fallback: build from raw token
  const token = await storage.get(SESSION_TOKEN_KEY);
  if (!token) return null;
  return `${COOKIE_NAME}=${token}`;
}

export async function signOut(): Promise<void> {
  await storage.delete(SESSION_TOKEN_KEY);
  await storage.delete(SESSION_COOKIE_KEY);
}
