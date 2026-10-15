// Send all client requests to the Next.js proxy at /api/backend; the proxy enforces
// NextAuth session checks and forwards to the real FastAPI host with X-Admin-Token.
// Browser hits http://localhost:3000/api/backend/...; the proxy forwards to BACKEND_BASE_URL (e.g. http://localhost:8000).
const baseUrl = "/api/backend";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

async function requestForm<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

async function requestEmpty(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
}

// Errors above look like `Request failed (409): {"detail": ...}`; detail is a
// string or {code, message}.
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/\{.*\}$/);
  if (match) {
    try {
      const detail = JSON.parse(match[0]).detail;
      if (typeof detail === "string") return detail;
      if (detail?.message) return detail.message;
    } catch {
      // fall through
    }
  }
  return error.message || fallback;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  deleteEmpty: (path: string) => requestEmpty(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    requestForm<T>(path, { method: "POST", body: formData })
};
