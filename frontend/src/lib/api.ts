export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfReady: Promise<void> | null = null;

/**
 * Sanctum SPA auth needs a fresh XSRF-TOKEN cookie before any state-changing
 * request. Fetched lazily (once, then re-used) rather than on every mutation.
 */
function ensureCsrfCookie(): Promise<void> {
  if (!csrfReady) {
    csrfReady = fetch(`${API_URL}/sanctum/csrf-cookie`, {
      credentials: "include",
    }).then(() => undefined);
  }
  return csrfReady;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  cache?: RequestCache;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData, cache } = options;

  if (method !== "GET") {
    await ensureCsrfCookie();
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const xsrfToken = readCookie("XSRF-TOKEN");
  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    cache: cache ?? "no-store",
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = data?.message ?? res.statusText ?? "Something went wrong.";
    throw new ApiError(message, res.status, data?.errors);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: { cache?: RequestCache }) =>
    request<T>(path, { method: "GET", cache: options?.cache }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData, isFormData: true }),
};

/**
 * Laravel auto-wraps a lone JsonResource/ResourceCollection returned
 * directly from a controller as `{ data: ... }` (paginated collections are
 * the exception — there `data` sits alongside `meta`/`links` and is the
 * payload shape itself, not a wrapper to unwrap). Use these `*Resource`
 * variants for single-resource and non-paginated-collection endpoints;
 * use the plain `api.*` methods for paginated lists and hand-built
 * `response()->json([...])` payloads, which aren't wrapped.
 */
export const apiResource = {
  get: <T>(path: string, options?: { cache?: RequestCache }) =>
    api.get<{ data: T }>(path, options).then((r) => r.data),
  post: <T>(path: string, body?: unknown) => api.post<{ data: T }>(path, body).then((r) => r.data),
  put: <T>(path: string, body?: unknown) => api.put<{ data: T }>(path, body).then((r) => r.data),
  patch: <T>(path: string, body?: unknown) => api.patch<{ data: T }>(path, body).then((r) => r.data),
  delete: <T>(path: string, body?: unknown) => api.delete<{ data: T }>(path, body).then((r) => r.data),
};

export const swrFetcher = <T>(path: string) => api.get<T>(path);
export const swrFetcherResource = <T>(path: string) => apiResource.get<T>(path);

export function fieldError(errors: Record<string, string[]> | undefined, field: string): string | undefined {
  return errors?.[field]?.[0];
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
