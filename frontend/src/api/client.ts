// Ivy Homes API client.
//
// The documentation is wrong about several things we rely on here - see
// README.md and submission.json's `findings` for the full list. The two
// that shape this file:
//
//  - The API key must be sent as an `X-API-Key` header, not a `?api_key=`
//    query parameter as documented.
//  - Login gives a 15-minute access token (`expires_in: 900`), not the
//    documented 24 hours, but there IS a working (undocumented)
//    `/auth/refresh` flow despite the docs saying "there is no refresh
//    flow". We use it to keep sessions alive silently.

import type { Page } from "./types";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://solve.ivy.homes";
export const API_KEY = import.meta.env.VITE_IVY_API_KEY || "IVY26-C9AFDB548E11";

const STORAGE_KEY = "ivy_session";

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  user: { email: string };
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

let refreshPromise: Promise<StoredSession> | null = null;

async function doLogin(email: string, password: string): Promise<StoredSession> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Login failed (${res.status})`);
  }
  const body = await res.json();
  const session: StoredSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
    user: body.user,
  };
  saveSession(session);
  return session;
}

async function doRefresh(session: StoredSession): Promise<StoredSession> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) {
    clearSession();
    throw new Error("Session expired, please log in again");
  }
  const body = await res.json();
  const next: StoredSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
    user: body.user,
  };
  saveSession(next);
  return next;
}

// Refreshes 30s ahead of expiry, and de-dupes concurrent refresh attempts.
async function ensureValidSession(): Promise<StoredSession> {
  const session = loadSession();
  if (!session) throw new Error("Not logged in");
  if (Date.now() < session.expires_at - 30_000) return session;
  if (!refreshPromise) {
    refreshPromise = doRefresh(session).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const auth = {
  login: doLogin,
  logout() {
    clearSession();
  },
  currentUser(): { email: string } | null {
    return loadSession()?.user ?? null;
  },
  isLoggedIn(): boolean {
    return loadSession() !== null;
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await ensureValidSession();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  }
  return usp.toString();
}

export async function fetchPage<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<Page<T>> {
  const qs = buildQuery(params);
  return apiFetch<Page<T>>(`${path}${qs ? `?${qs}` : ""}`);
}

// Pages all the way to the end via limit/offset (the shape the API actually
// returns - see findings: pagination. The documented `page`/`page_size`
// request params and response shape don't exist). The server also caps
// `limit` at 50 regardless of what's requested, despite docs claiming 200.
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T[]> {
  const limit = 50;
  let offset = 0;
  let all: T[] = [];
  while (true) {
    const page = await fetchPage<T>(path, { ...params, limit, offset });
    all = all.concat(page.results);
    if (!page.has_more || page.results.length === 0) break;
    offset += page.results.length;
  }
  return all;
}
