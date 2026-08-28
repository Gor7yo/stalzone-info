import { IQueryParamsAuction } from "@/features/auction/types";
import { IQueryParamsCharacter } from "@/features/character/types";
import { IQueryParamsClan } from "@/features/clans/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(
  endpoint: string,
  queryParams?: IQueryParamsAuction | IQueryParamsClan | IQueryParamsCharacter,
  options?: RequestInit,
): Promise<T> {
  const params = new URLSearchParams({
    additional: queryParams?.additional ?? "false",
    offset: queryParams?.offset ?? "0",
  });

  const response = await fetch(
    `${API_URL}${endpoint}${queryParams && params ? `&${params.toString()}` : ""}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    },
  );

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
}
