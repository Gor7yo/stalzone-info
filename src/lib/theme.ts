/** Тема сайта: тёмная по умолчанию, светлая — <html data-theme="light">. Без "use client": нужно и серверу. */
export type Theme = "dark" | "light";

/** Ключ выбора в localStorage. */
export const THEME_KEY = "stalzone:theme";

/** Ставит сохранённую тему до первой отрисовки — без вспышки тёмной у тех, кто выбрал светлую. */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
