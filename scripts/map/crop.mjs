// Вырезает локации из карты ПДА в полном разрешении (512 px на регион).
// node crop.mjs <папка .ol> <папка вывода>
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { decodeOl } from "./ol.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const R = 512;

// рамки пользователя (в регионах, дробно): [x0, x1, z0, z1]
const LOCATIONS = {
  "01": [-22.04, -12.0, -0.02, 8.06],
  "02": [-12.0, -4.95, -3.05, -0.12],
  "03": [-12.0, -4.95, -0.12, 8.99],
  "04": [-2.54, -0.29, -1.29, 0.68],
  "05": [-0.01, 2.28, 1.4, 3.52],
  "06": [-3.19, 0.24, 3.89, 8.43],
  "07": [6.42, 8.67, -4.84, -2.71],
  "08": [9.17, 10.99, -4.56, -2.74],
  "09": [12.44, 17.95, -3.33, 3.46],
  "10": [7.81, 12.14, 4.2, 8.68],
};

const [dir, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
for (const [name, [x0, x1, z0, z1]] of Object.entries(LOCATIONS)) {
  const rx0 = Math.floor(x0), rx1 = Math.ceil(x1) - 1, rz0 = Math.floor(z0), rz1 = Math.ceil(z1) - 1;
  const composites = [];
  for (let x = rx0; x <= rx1; x++)
    for (let z = rz0; z <= rz1; z++) {
      const f = join(dir, `r.${x}.${z}.ol`);
      if (!existsSync(f)) continue;
      const d = decodeOl(readFileSync(f));
      composites.push({ input: d.rgba, raw: { width: d.width, height: d.height, channels: 4 }, left: (x - rx0) * R, top: (z - rz0) * R });
    }
  const W = (rx1 - rx0 + 1) * R, H = (rz1 - rz0 + 1) * R;
  const full = await sharp({ create: { width: W, height: H, channels: 4, background: "#000000" } })
    .composite(composites)
    .raw()
    .toBuffer();
  const left = Math.round((x0 - rx0) * R), top = Math.round((z0 - rz0) * R);
  const width = Math.round((x1 - x0) * R), height = Math.round((z1 - z0) * R);
  const file = join(out, `location-${name}.png`);
  const info = await sharp(full, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width, height })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(name, `${info.width}x${info.height}`, `${(info.size / 1e6).toFixed(1)} МБ`);
}
