import { BASE_URL } from "@/constants/config";
import { getSessionCookie, signOut } from "./auth";

export async function apiFetch<T>(path: string): Promise<T> {
  const cookie = await getSessionCookie();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (res.status === 401) {
    await signOut();
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
