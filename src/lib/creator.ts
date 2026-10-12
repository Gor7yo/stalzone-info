import type { Region } from "./regions";

/** Автор STALZONE INFO: ник для подписи и игровой персонаж с особым профилем. */
export const CREATOR = {
  nick: "gor2210",
  character: "BANDIT__IVAN_KIL",
  region: "ru" as Region,
};

export const creatorHref = `/character/${CREATOR.region}/${CREATOR.character}`;

export const isCreator = (region: Region, name: string) =>
  region === CREATOR.region && name.toLowerCase() === CREATOR.character.toLowerCase();
