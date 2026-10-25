// Пирамида плиток 256×256 WebP для Leaflet: node tiles.mjs <локация.png> <папка вывода>
// Раскладка google: {z}/{y}/{x}.webp, картинка в левом верхнем углу, 1 px = 1 блок на последнем зуме.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
sharp.cache(false);

const [input, out] = process.argv.slice(2);
const meta = await sharp(input, { limitInputPixels: false }).metadata();
await sharp(input, { limitInputPixels: false })
  .webp({ quality: 72, effort: 5 })
  .tile({ size: 256, layout: "google", centre: false, background: { r: 0, g: 0, b: 0, alpha: 0 }, skipBlanks: -1 })
  .toFile(out);
const maxZoom = Math.ceil(Math.log2(Math.max(meta.width, meta.height) / 256));
console.log(JSON.stringify({ width: meta.width, height: meta.height, maxZoom }));
