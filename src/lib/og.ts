/** Общее для картинок-превью ссылок (opengraph-image): цвета, шрифт с кириллицей, короткие числа. */

export const OG_BG = "#07080a";
/** акцент сайта (--acc в globals.css) */
export const OG_ACC = "#d4ff3a";
export const ogAcc = (a: number) => `rgba(212,255,58,${a})`;
export const OG_TEXT = "#f2f4ee";
export const ogText = (a: number) => `rgba(242,244,238,${a})`;

/** «14,8к», «3,5кк» — как на сайте. */
export function short(value: number) {
  const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: n < 100 ? 1 : 0 });
  if (value >= 1_000_000) return `${fmt(value / 1_000_000)}кк`;
  if (value >= 1_000) return `${fmt(value / 1_000)}к`;
  return fmt(value);
}

/** «12 345» — целое с пробелами. */
export const int = (n: number) => Math.round(n).toLocaleString("ru-RU");

/**
 * Шрифт сайта (Manrope) с кириллицей — только нужные буквы, через Google Fonts:
 * встроенный шрифт генератора кириллицу не рисует.
 */
async function font(text: string, weight: 600 | 800) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}&text=${encodeURIComponent(text)}`, {
    next: { revalidate: 86_400 },
  }).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("шрифт не найден");
  return fetch(url).then((r) => r.arrayBuffer());
}

/** Manrope 600 и 800 под все строки картинки; нет сети до Google Fonts — undefined (латиница останется читаемой). */
export function ogFonts(texts: string[]) {
  const text = texts.join("");
  return Promise.all([font(text, 600), font(text, 800)])
    .then(([regular, bold]) => [
      { name: "Manrope", data: regular, weight: 600 as const, style: "normal" as const },
      { name: "Manrope", data: bold, weight: 800 as const, style: "normal" as const },
    ])
    .catch(() => undefined);
}
