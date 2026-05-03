import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "@/constants/config";

const SESSION_KEY = "mcube_session_cookie";

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Invalid email or password");
  }

  // Extract the session cookie from the response
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No session returned from server");

  await SecureStore.setItemAsync(SESSION_KEY, cookie);
}

export async function getSessionCookie(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
