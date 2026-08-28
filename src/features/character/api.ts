import { apiFetch } from "@/lib/api/client";
import { ICharacterProfile } from "./types";

export function getCharacter(region: string, username: string) {
  return apiFetch<ICharacterProfile>(
    `/api/character/profile?region=${region}&username=${username}`,
  );
}
