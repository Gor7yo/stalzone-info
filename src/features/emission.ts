"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";

export interface EmissionResponse {
  currentStart?: string | null;
  previousStart?: string | null;
  previousEnd?: string | null;
}

export type EmissionState =
  { phase: "active"; since: number } | { phase: "calm"; since: number; lastDuration: number | null } | { phase: "unknown" };

export function emissionState(data?: EmissionResponse): EmissionState {
  if (data?.currentStart) return { phase: "active", since: new Date(data.currentStart).getTime() };
  if (data?.previousEnd) {
    const end = new Date(data.previousEnd).getTime();
    const start = data.previousStart ? new Date(data.previousStart).getTime() : null;
    return { phase: "calm", since: end, lastDuration: start ? end - start : null };
  }
  return { phase: "unknown" };
}

export function useEmission(region: Region) {
  return useQuery({
    queryKey: ["emission", region],
    queryFn: () => api<EmissionResponse>("/api/emission", { region }),
    // во время выброса опрашиваем чаще
    refetchInterval: (query) => (query.state.data?.currentStart ? 10_000 : 30_000),
    staleTime: 10_000,
  });
}
