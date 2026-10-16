import { cookies } from "next/headers";
import { makeFormat } from "@/lib/format";
import { DEFAULT_LANG, dicts, isLang, LANG_COOKIE, type Lang } from "./index";

/** Язык из cookie; null - пользователь ещё не выбирал (тогда браузер может подставить язык Telegram). */
export async function getSavedLang(): Promise<Lang | null> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : null;
}

export const getLang = async (): Promise<Lang> => (await getSavedLang()) ?? DEFAULT_LANG;

/** Словарь для серверных компонентов. Метаданные (SEO) остаются русскими - их через getT() не переводим. */
export async function getT() {
  const lang = await getLang();
  return { t: dicts[lang], lang, format: makeFormat(lang) };
}
