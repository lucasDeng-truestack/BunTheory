"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";
const TOKEN_KEY = "br_token";

// The API is on another origin, so the session travels as a bearer token, not a cookie.
// Storage access is wrapped: private windows can throw.
export function getAuthToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [emailOTPClient()],
  fetchOptions: {
    auth: { type: "Bearer", token: getAuthToken },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (!token) return;
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {}
    },
  },
});
