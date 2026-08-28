"use client";

import { init } from "@telegram-apps/sdk-react";

export function initTelegram() {
  if (process.env.NODE_ENV === "development") return;

  init();
}
