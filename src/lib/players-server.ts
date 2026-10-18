import type { Character, Progress } from "@/features/character";

/**
 * Профиль игрока, прогресс и клан на сервере — для картинок-превью и заголовков страниц.
 * Кеш 10 минут; не ответили за 3 с или ошибка — null (картинка нарисуется без цифр).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.stalzone-info.ru";

async function get<T>(path: string, params: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}?${new URLSearchParams(params)}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const serverCharacter = (region: string, username: string) => get<Character>("/api/character/profile", { region, username });

export const serverProgress = (region: string, username: string) =>
  get<Progress>("/api/character/progress", { region, username, period: "week" });

export interface ServerClan {
  id: string;
  name: string;
  tag: string;
  level: number;
  leader: string;
  memberCount: number;
  alliance?: string;
  registrationTime: string;
}

export const serverClan = (region: string, clanId: string) => get<ServerClan>("/api/clan/info", { region, clanId });
