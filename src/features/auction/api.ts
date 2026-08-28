import { apiFetch } from "@/lib/api/client";
import { AuctionLots, IQueryParamsAuction } from "./types";

export function getAuctionLots(
  region: string,
  item: string,
  queryParams?: IQueryParamsAuction,
) {
  return apiFetch<AuctionLots>(
    `/api/auction/lots?region=${region}&item=${item}`,
    queryParams,
  );
}

export function getAuctionHistory(
  region: string,
  item: string,
  queryParams?: IQueryParamsAuction,
) {
  return apiFetch<AuctionLots>(
    `/api/auction/history?region=${region}&item=${item}`,
    queryParams,
  );
}
