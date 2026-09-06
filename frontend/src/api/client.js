/**
 * Central fetch wrapper.
 *
 * The backend authenticates via an HttpOnly `access_token` cookie set on
 * /auth/login — there is no bearer token to attach manually. Every request
 * just needs `credentials: "include"` so the browser sends that cookie
 * (and accepts new ones) even when frontend/backend run on different
 * ports in dev.
 *
 * All non-2xx responses are normalized into an ApiError so callers (and
 * the global ErrorModal) can show something consistent regardless of
 * whether FastAPI returned a `{"detail": "..."}` string, a validation
 * error array, or nothing parseable at all.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function extractDetailMessage(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  // FastAPI validation errors: [{ loc, msg, type }, ...]
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d?.msg ? d.msg : JSON.stringify(d)))
      .join(" \u2022 ");
  }
  return JSON.stringify(detail);
}

async function request(path, { method = "GET", body, params, signal } = {}) {
  let url = `${API_BASE}${path}`;

  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        qs.append(key, value);
      }
    });
    const qsString = qs.toString();
    if (qsString) url += `?${qsString}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkErr) {
    throw new ApiError(
      "Can't reach the server. Check that the backend is running and reachable.",
      0,
      null
    );
  }

  // 204 / empty body
  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const detailMsg = extractDetailMessage(data?.detail ?? data);
    throw new ApiError(
      detailMsg || `Request failed (${response.status})`,
      response.status,
      data?.detail ?? data
    );
  }

  return data;
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
