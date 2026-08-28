export interface AuctionHistory {
  total: number;
  prices: {
    amount: number;
    price: number;
    time: Date;
    additional: { [key: string]: any };
  }[];
}

export interface AuctionLots {
  total: number;
  lots: {
    itemId: string;
    amount: number;
    startPrice: number;
    currentPrice: number;
    buyoutPrice: number;
    startTime: Date;
    endTime: Date;
    additional: { [key: string]: any };
  }[];
}

export interface IQueryParamsAuction {
  additional: string;
  limit: string;
  offset: string;
}
