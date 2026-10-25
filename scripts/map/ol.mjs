// Декодер .ol (карта ПДА STALZONE): заголовок → LZ4-блок верхнего уровня → DXT1/DXT5 → RGBA.
// node ol.mjs <файл.ol> <выход.png>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

export function parseOl(buf) {
  if (buf.readUInt32BE(0) !== 0x0a9523fd) throw new Error("не .ol");
  const width = buf.readUInt32BE(4);
  const height = buf.readUInt32BE(8);
  const levels = buf.readUInt32BE(12);
  const format = buf.toString("latin1", 16, 32);
  let p = 33; // + флаг (1 байт)
  const raw = [], packed = [];
  for (let i = 0; i < levels; i++, p += 4) raw.push(buf.readUInt32BE(p));
  for (let i = 0; i < levels; i++, p += 4) packed.push(buf.readUInt32BE(p));
  const hashLen = buf.readUInt16BE(p);
  p += 2 + hashLen;
  const offsets = [];
  for (const n of packed) { offsets.push(p); p += n; }
  if (p !== buf.length) throw new Error(`размер не сходится: ${p} != ${buf.length}`);
  return { width, height, levels, format, raw, packed, offsets };
}

/** LZ4 block (без фрейма). */
export function lz4(src, outSize) {
  const out = Buffer.alloc(outSize);
  let i = 0, o = 0;
  while (i < src.length) {
    const token = src[i++];
    let lit = token >> 4;
    if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
    src.copy(out, o, i, i + lit); i += lit; o += lit;
    if (i >= src.length) break;
    const off = src[i] | (src[i + 1] << 8); i += 2;
    let len = token & 15;
    if (len === 15) { let b; do { b = src[i++]; len += b; } while (b === 255); }
    len += 4;
    for (let k = 0; k < len; k++, o++) out[o] = out[o - off];
  }
  if (o !== outSize) throw new Error(`lz4: ${o} != ${outSize}`);
  return out;
}

const c565 = (c) => [((c >> 11) & 31) * 255 / 31, ((c >> 5) & 63) * 255 / 63, (c & 31) * 255 / 31];

function colorBlock(d, at, rgba, w, bx, by, dxt1) {
  const c0 = d.readUInt16LE(at), c1 = d.readUInt16LE(at + 2), bits = d.readUInt32LE(at + 4);
  const a = c565(c0), b = c565(c1);
  const pal = [a, b];
  if (!dxt1 || c0 > c1) {
    pal.push(a.map((v, k) => (2 * v + b[k]) / 3), a.map((v, k) => (v + 2 * b[k]) / 3));
  } else {
    pal.push(a.map((v, k) => (v + b[k]) / 2), [0, 0, 0, -1]);
  }
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const c = pal[(bits >>> (2 * (4 * y + x))) & 3];
    const q = ((by * 4 + y) * w + bx * 4 + x) * 4;
    rgba[q] = c[0]; rgba[q + 1] = c[1]; rgba[q + 2] = c[2];
    rgba[q + 3] = c[3] === -1 ? 0 : 255;
  }
}

function alphaBlock(d, at, rgba, w, bx, by) {
  const a0 = d[at], a1 = d[at + 1];
  const pal = [a0, a1];
  if (a0 > a1) for (let k = 1; k < 7; k++) pal.push(((7 - k) * a0 + k * a1) / 7);
  else { for (let k = 1; k < 5; k++) pal.push(((5 - k) * a0 + k * a1) / 5); pal.push(0, 255); }
  let bits = 0n;
  for (let k = 0; k < 6; k++) bits |= BigInt(d[at + 2 + k]) << BigInt(8 * k);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const idx = Number((bits >> BigInt(3 * (4 * y + x))) & 7n);
    rgba[((by * 4 + y) * w + bx * 4 + x) * 4 + 3] = pal[idx];
  }
}

/** DXT → RGBA. dxt5: 16 байт на блок (альфа + цвет), иначе DXT1. */
export function dxt(data, w, h, dxt5) {
  const rgba = Buffer.alloc(w * h * 4);
  const bw = Math.max(1, w / 4), bh = Math.max(1, h / 4);
  let at = 0;
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    if (dxt5) { colorBlock(data, at + 8, rgba, w, bx, by, false); alphaBlock(data, at, rgba, w, bx, by); at += 16; }
    else { colorBlock(data, at, rgba, w, bx, by, true); at += 8; }
  }
  return rgba;
}

export function decodeOl(buf) {
  const h = parseOl(buf);
  const level0 = lz4(buf.subarray(h.offsets[0], h.offsets[0] + h.packed[0]), h.raw[0]);
  const dxt5 = h.raw[0] === h.width * h.height;
  return { ...h, dxt5, rgba: dxt(level0, h.width, h.height, dxt5) };
}

if (process.argv[1]?.endsWith("ol.mjs") && process.argv[2]) {
  const r = decodeOl(readFileSync(process.argv[2]));
  console.log(r.width, r.height, r.levels, JSON.stringify(r.format), r.dxt5 ? "DXT5" : "DXT1");
  await sharp(r.rgba, { raw: { width: r.width, height: r.height, channels: 4 } }).png().toFile(process.argv[3]);
  console.log("ok", process.argv[3]);
}
