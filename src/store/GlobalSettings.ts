import { makeAutoObservable } from "mobx";

export type Region = "ru" | "eu" | "nea" | "sea";

const STORAGE_KEYS = {
  region: "stalzone_region",
  auctionLastItemName: "stalzone_auction_last_item_name",
  characterName: "stalzone_character_name",
} as const;

export class GlobalStore {
  region: Region = "ru";
  auctionLastItemName = "";
  auctionPages = 0;
  characterName = "";

  auctionItem?: {
    name: string;
    category: string;
    price: number;
    quantity: number;
    startPrice: number;
    time: string;
  };

  constructor() {
    makeAutoObservable(this);
  }

  hydrate() {
    if (typeof window === "undefined") return;

    const region = localStorage.getItem(STORAGE_KEYS.region);

    if (this.isValidRegion(region)) {
      this.region = region;
    }

    this.auctionLastItemName =
      localStorage.getItem(STORAGE_KEYS.auctionLastItemName) ?? "";

    this.characterName = localStorage.getItem(STORAGE_KEYS.characterName) ?? "";
  }

  changeRegion(region: Region) {
    this.region = region;
    localStorage.setItem(STORAGE_KEYS.region, region);
  }

  setAuctionItemName(name: string) {
    this.auctionLastItemName = name;
    localStorage.setItem(STORAGE_KEYS.auctionLastItemName, name);
  }

  setCharacterName(name: string) {
    this.characterName = name;
    localStorage.setItem(STORAGE_KEYS.characterName, name);
  }

  getAuctionPage(total: number) {
    this.auctionPages = total / 20;
    return this.auctionPages;
  }

  setAuctionItem(item: typeof this.auctionItem) {
    this.auctionItem = item;
  }

  private isValidRegion(value: string | null): value is Region {
    return (
      value === "ru" || value === "eu" || value === "nea" || value === "sea"
    );
  }
}
