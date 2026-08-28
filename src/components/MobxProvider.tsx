'use client'

import { GlobalStore } from "@/store/GlobalSettings";
import { enableStaticRendering } from "mobx-react-lite";
import { createContext, useContext } from "react";

enableStaticRendering(typeof window === "undefined");

class RootStore {
  globalStore: GlobalStore;

  constructor() {
    this.globalStore = new GlobalStore();
  }
}

const StoreContext = createContext<RootStore | null>(null);

export const MobxProvider = ({ children }: { children: React.ReactNode }) => {
  const store = new RootStore();

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a MobxProvider");

  return context;
};
