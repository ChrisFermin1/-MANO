// ── Thin REST client — swap BASE_URL to your FastAPI server ───────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getDashboard: () => apiFetch<import("./types").DashboardData>("/dashboard"),

  // Jobs
  getJobs: () => apiFetch<import("./types").Job[]>("/jobs"),
  getJob: (id: string) => apiFetch<import("./types").Job>(`/jobs/${id}`),
  createJob: (body: { description: string }) =>
    apiFetch<import("./types").Job>("/jobs", { method: "POST", body: JSON.stringify(body) }),
  updateJobStatus: (id: string, status: import("./types").JobStatus) =>
    apiFetch<import("./types").Job>(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Alerts
  getAlerts: () => apiFetch<import("./types").Alert[]>("/alerts"),
  dismissAlert: (id: string) =>
    apiFetch<void>(`/alerts/${id}`, { method: "DELETE" }),

  // AI / Mano
  extractJob: (message: string) =>
    apiFetch<import("./types").ManoExtraction>("/mano/extract", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  validateJob: (jobId: string) =>
    apiFetch<import("./types").OjoValidation>(`/ojo/validate/${jobId}`),
  generateQuote: (jobId: string) =>
    apiFetch<{ quote_text: string; amount: number }>(`/mano/quote/${jobId}`, {
      method: "POST",
    }),
  draftFollowUp: (jobId: string) =>
    apiFetch<{ message: string }>(`/mano/follow-up/${jobId}`, { method: "POST" }),
  getNextAction: () =>
    apiFetch<import("./types").NextAction | null>("/ojo/next-action"),
};
