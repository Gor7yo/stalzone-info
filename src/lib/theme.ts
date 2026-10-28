/** Тема сайта: тёмная по умолчанию, светлая — <html data-theme="light">. Без "use client": нужно и серверу. */
export type Theme = "dark" | "light";

/** Ключ выбора в localStorage. */
export const THEME_KEY = "stalzone:theme";

/** Боковое меню свёрнуто в рельсу с иконками — <html data-side="rail">; ключ выбора в localStorage. */
export const SIDE_KEY = "stalzone:side";

/**
 * Ставит сохранённые тему и вид меню до первой отрисовки — без вспышки тёмной темы
 * у тех, кто выбрал светлую, и без прыжка ширины у тех, кто свернул меню.
 */
export const THEME_SCRIPT = `try{var s=localStorage,d=document.documentElement.dataset;if(s.getItem("${THEME_KEY}")==="light")d.theme="light";if(s.getItem("${SIDE_KEY}")==="rail")d.side="rail"}catch(e){}`;
