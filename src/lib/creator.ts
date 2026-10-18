import type { Region } from "./regions";

/** Автор STALZONE INFO: ник для подписи и игровой персонаж с особым профилем. */
export const CREATOR = {
  nick: "gor2210",
  character: "BANDIT__IVAN_KIL",
  region: "ru" as Region,
};

export const creatorHref = `/character/${CREATOR.region}/${CREATOR.character}`;

/** Связь с автором: вопросы, жалобы, запросы на удаление данных (правила и политика конфиденциальности). */
export const CONTACT_URL = "https://t.me/stalzoneinfo_bot";
export const CONTACT_LABEL = "Telegram @stalzoneinfo_bot";

/** Донаты на развитие проекта (DonationAlerts). */
export const DONATE_URL = "https://dalink.to/gor2210";

export const isCreator = (region: Region, name: string) =>
  region === CREATOR.region && name.toLowerCase() === CREATOR.character.toLowerCase();
