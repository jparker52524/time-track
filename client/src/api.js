const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  // Only redirect on 403 (unauthorized / token expired)
  if (res.status === 403) {
    localStorage.removeItem("token");
    window.location.href = "/"; // go to login
    return;
  }

  if (!res.ok) {
    const message = data?.error || res.statusText || "Unknown API error";
    throw new Error(`API Error (${res.status}): ${message}`);
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: "POST", body }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body }),
  patch: (endpoint, body) => request(endpoint, { method: "PATCH", body }),
  delete: (endpoint, body) => request(endpoint, { method: "DELETE", body }),
};
