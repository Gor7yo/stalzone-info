import { apiFetch } from "@/lib/api/client";
import { IClanInfo, IQueryParamsClan, IRegionData } from "./types";

export function getClanInfo(
  region: string,
  clanId: string,
  queryParams?: IQueryParamsClan,
) {
  return apiFetch<IClanInfo>(
    `/api/clan/info?region=${region}&clanId=${clanId}`,
  );
}

export function getClansList(region: string, queryParams?: IQueryParamsClan) {
  return apiFetch<IRegionData>(`/api/clan/list?region=${region}`, queryParams);
}
