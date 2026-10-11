const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

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
    throw new ApiError(response.status, response.statusText || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 400);
