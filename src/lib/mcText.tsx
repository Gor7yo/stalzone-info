/**
 * Игровые коды форматирования (§a, §l …) → React-элементы.
 * Без dangerouslySetInnerHTML: текст никогда не интерпретируется как HTML.
 */

const COLORS: Record<string, string> = {
  "0": "#3a3a3a",
  "1": "#3b5bff",
  "2": "#2fbf4a",
  "3": "#2fc2c2",
  "4": "#d33a3a",
  "5": "#b64ad6",
  "6": "#ffb020",
  "7": "#b4b4b4",
  "8": "#707070",
  "9": "#6b7bff",
  a: "#6dff6d",
  b: "#6dffff",
  c: "#ff6b6b",
  d: "#ff6bff",
  e: "#ffff6b",
  f: "#ffffff",
};

export function McText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let style: React.CSSProperties = {};

  text.split("§").forEach((part, i) => {
    if (i === 0) {
      if (part) nodes.push(part);
      return;
    }
    // §#00EFE8 — произвольный цвет (новый формат игры)
    const hex = /^#[0-9a-f]{6}/i.exec(part)?.[0];
    const code = hex ? "#" : part[0]?.toLowerCase();
    const rest = part.slice(hex ? 7 : 1);

    if (hex) style = { color: hex };
    else if (code && COLORS[code]) style = { color: COLORS[code] };
    else if (code === "l") style = { ...style, fontWeight: 800 };
    else if (code === "o") style = { ...style, fontStyle: "italic" };
    else if (code === "n") style = { ...style, textDecoration: "underline" };
    else if (code === "m") style = { ...style, textDecoration: "line-through" };
    else if (code === "r") style = {};

    if (rest) nodes.push(Object.keys(style).length ? <span key={i} style={style}>{rest}</span> : rest);
  });

  return <>{nodes}</>;
}

export const stripMc = (text: string) => text.replace(/§(#[0-9a-f]{6}|[0-9a-fk-or])/gi, "");
