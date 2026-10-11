/** Shared FastAPI transport. A failed request never becomes mock or empty data. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new Error("No se pudo conectar con Mano. Revisa la conexión e intenta de nuevo.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((item: { loc?: (string | number)[]; msg?: string }) => `${item.loc?.join(".") ?? "request"}: ${item.msg ?? "Invalid value"}`).join("; ")
      : response.statusText || "Error del servidor";
    throw new ApiError(response.status, `${message} (HTTP ${response.status})`);
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
