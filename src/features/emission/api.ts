import { apiFetch } from "@/lib/api/client";
import { Emission } from "./types";

export function getEmission(region: string) {
  return apiFetch<Emission>(
    `/api/emission?region=${encodeURIComponent(region)}`
  );
}
