const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** машинный код сервера: pro_required, limit… */
    public code?: string,
  ) {
    super(message);
  }
}

/** Сервер ответил «доступно в Pro». */
export const isProRequired = (error: unknown) => error instanceof ApiError && error.code === "pro_required";

type Params = Record<string, string | number | boolean | undefined>;

export async function api<T>(path: string, params: Params = {}, init?: RequestInit): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const response = await fetch(`${API_URL}${path}?${search}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[]; code?: string } | null;
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    if (message) throw new ApiError(response.status, message, body?.code);
    throw new ApiError(response.status, response.statusText || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 400);
