/**
 * Сравнение двух игроков по статистике профиля — без "use client": нужно и странице,
 * и картинке-превью ссылки (сервер).
 */

interface StatsHolder {
  stats?: { id: string; value: number | string }[];
}

const HOUR = 3_600_000;

/** Числовая стата профиля по id EXBO; нет — 0. */
export function statOf(c: StatsHolder, id: string) {
  const v = c.stats?.find((s) => s.id === id)?.value;
  return typeof v === "number" ? v : Number(v) || 0;
}

export type CompareKey = "kd" | "kills" | "damage" | "accuracy" | "headshots" | "streak" | "mutants" | "played";

const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

/**
 * Главные показатели игрока: больше — лучше. played — в часах, accuracy и headshots — в %.
 * Порядок ключей — порядок осей октагона: боевые рядом, «в игре» замыкает круг.
 */
export function playerStats(c: StatsHolder): Record<CompareKey, number> {
  const kills = statOf(c, "kil");
  const deaths = statOf(c, "dea");
  const hits = statOf(c, "sho-hit");
  return {
    kd: deaths ? kills / deaths : kills,
    kills,
    damage: statOf(c, "dam-dea-all"),
    accuracy: pct(hits, statOf(c, "sho-fir")),
    headshots: pct(statOf(c, "sho-hea"), hits),
    streak: statOf(c, "max-kil-ser"),
    mutants: statOf(c, "mut-kil"),
    played: statOf(c, "pla-tim") / HOUR,
  };
}

/** Показатели двух игроков построчно. */
export function compareStats(a: StatsHolder, b: StatsHolder) {
  const sa = playerStats(a);
  const sb = playerStats(b);
  return (Object.keys(sa) as CompareKey[]).map((key) => ({ key, a: sa[key], b: sb[key] }));
}

/** Счёт: в скольких показателях каждый впереди (ничьи и пустые не считаем). */
export function score(rows: { a: number; b: number }[]) {
  return {
    a: rows.filter((r) => r.a > r.b).length,
    b: rows.filter((r) => r.b > r.a).length,
  };
}
