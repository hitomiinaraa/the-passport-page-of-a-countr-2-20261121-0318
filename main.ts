// The Passport Page of a Country That Isn't There — v1
// Republic of Caelum: a mountain observatory republic. Holder: Elena Kovac,
// astronomer of the summit observatory. Generates a 1024x1024 PNG passport
// spread, deterministic, no network. Node 22 stdlib only (fs, zlib).
// Hand-rolled PNG encoder, own 5x7 bitmap font, vector portrait, rotated
// ink stamps, ICAO TD3 MRZ with verified check digits.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------- CRC32 (table computed at startup) ----------------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE.push(c >>> 0);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------------- PNG encoder (RGB, filter 0) ----------------
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------- 5x7 bitmap font (own letterforms) ----------------
// Each glyph: 7 rows, 5 bits each, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "<": [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  ">": [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
};
const BLANK: number[] = [0, 0, 0, 0, 0, 0, 0];

// ---------------- Surface (RGB pixels + drawn mask) ----------------
type RGB = [number, number, number];

class Surface {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  readonly mask: Uint8Array;
  constructor(w: number, h: number, fill: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.mask = new Uint8Array(w * h);
    this.fillRect(0, 0, w, h, fill);
  }
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: RGB): void {
    if (!this.inBounds(x, y)) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
    this.mask[y * this.w + x] = 1;
  }
  blend(x: number, y: number, c: RGB, a: number): void {
    if (!this.inBounds(x, y)) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = Math.round(this.px[i] * (1 - a) + c[0] * a);
    this.px[i + 1] = Math.round(this.px[i + 1] * (1 - a) + c[1] * a);
    this.px[i + 2] = Math.round(this.px[i + 2] * (1 - a) + c[2] * a);
    this.mask[y * this.w + x] = 1;
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.set(xx, yy, c);
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  hline(x: number, y: number, len: number, c: RGB, t = 1): void {
    this.fillRect(x, y, len, t, c);
  }
  vline(x: number, y: number, len: number, c: RGB, t = 1): void {
    this.fillRect(x, y, t, len, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      const half = Math.floor(Math.sqrt(r * r - (y - cy) * (y - cy)));
      for (let x = cx - half; x <= cx + half; x++) this.set(x, y, c);
    }
  }
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d <= r && d > r - t) this.set(x, y, c);
      }
    }
  }
  fillPolygon(pts: [number, number][], c: RGB): void {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.ceil(xs[k]), x1 = Math.floor(xs[k + 1]);
        for (let x = x0; x <= x1; x++) this.set(x, y, c);
      }
    }
  }
  text(str: string, x: number, y: number, scale: number, c: RGB, adv?: number): void {
    const step = adv ?? 6 * scale;
    let cx = x;
    for (const ch of str) {
      const g = FONT[ch] ?? BLANK;
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if ((g[r] >> (4 - col)) & 1) {
            this.fillRect(cx + col * scale, y + r * scale, scale, scale, c);
          }
        }
      }
      cx += step;
    }
  }
  textWidth(str: string, scale: number, adv?: number): number {
    const step = adv ?? 6 * scale;
    return str.length * step - (step - 5 * scale);
  }
  textCentered(str: string, cx: number, y: number, scale: number, c: RGB, adv?: number): void {
    this.text(str, cx - Math.floor(this.textWidth(str, scale, adv) / 2), y, scale, c, adv);
  }
}

// 8-point star polygon points (own geometry).
function starPoints(cx: number, cy: number, rOuter: number, rInner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
  }
  return pts;
}

// Blit a stamp layer rotated by deg around (cx, cy), in one ink colour.
function blitRotated(dst: Surface, src: Surface, cx: number, cy: number, deg: number, ink: RGB, alpha: number): void {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const r = Math.ceil(Math.sqrt((src.w / 2) ** 2 + (src.h / 2) ** 2)) + 2;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      const sx = Math.round(dx * cos + dy * sin + src.w / 2);
      const sy = Math.round(-dx * sin + dy * cos + src.h / 2);
      if (sx >= 0 && sx < src.w && sy >= 0 && sy < src.h && src.mask[sy * src.w + sx]) {
        dst.blend(x, y, ink, alpha);
      }
    }
  }
}

// ---------------- Palette ----------------
const DESK: RGB = [38, 43, 49];
const PAPER_L: RGB = [245, 240, 225];
const PAPER_R: RGB = [248, 244, 233];
const NAVY: RGB = [28, 47, 74];
const INK: RGB = [32, 36, 42];
const LABEL: RGB = [107, 114, 128];
const PORTRAIT_BG: RGB = [223, 231, 238];
const PORTRAIT_HALO: RGB = [209, 219, 229];
const WHITE: RGB = [255, 255, 255];
const STAMP_BLUE: RGB = [29, 78, 216];
const STAMP_GREEN: RGB = [22, 101, 52];
const STAMP_BROWN: RGB = [127, 29, 29];

// ---------------- Data (the spec) ----------------
const MRZ1 = "P<CAEKOVAC<<ELENA<<<<<<<<<<<<<<<<<<<<<<<<<<<";
const MRZ2 = "CA48291730CAE8803148F3306116<<<<<<<<<<<<<<<0";

interface Stamp { country: string; kind: string; date: string; ink: RGB; rot: number }
const STAMPS: Stamp[] = [
  { country: "MERIDIA", kind: "ENTRY", date: "03 SEP 2023", ink: STAMP_BLUE, rot: 4 },
  { country: "MERIDIA", kind: "EXIT", date: "17 SEP 2023", ink: STAMP_GREEN, rot: -4 },
  { country: "HALDEN", kind: "ENTRY", date: "22 JAN 2024", ink: STAMP_BROWN, rot: -4 },
  { country: "HALDEN", kind: "EXIT", date: "09 FEB 2024", ink: STAMP_BLUE, rot: 4 },
  { country: "OSTARA", kind: "ENTRY", date: "08 MAY 2025", ink: STAMP_GREEN, rot: 4 },
  { country: "OSTARA", kind: "EXIT", date: "21 MAY 2025", ink: STAMP_BROWN, rot: -4 },
  { country: "MERIDIA", kind: "ENTRY", date: "14 OCT 2025", ink: STAMP_BLUE, rot: 4 },
  { country: "MERIDIA", kind: "EXIT", date: "28 OCT 2025", ink: STAMP_GREEN, rot: -4 },
];

// ---------------- Stamp layer (drawn flat, then rotated on blit) ----------------
function makeStamp(s: Stamp): Surface {
  const W = 220, H = 105;
  const layer = new Surface(W, H, [0, 0, 0]);
  layer.mask.fill(0); // transparent: only drawn pixels carry ink
  layer.rect(1, 1, W - 2, H - 2, INK, 2);
  layer.rect(7, 7, W - 14, H - 14, INK, 1);
  layer.textCentered(s.country, W / 2, 15, 3, INK);
  layer.hline(16, 42, W - 32, INK, 1);
  layer.textCentered(s.kind, W / 2, 48, 2, INK);
  layer.textCentered(s.date, W / 2, 66, 3, INK);
  return layer;
}

// ---------------- Portrait (vector profile silhouette) ----------------
function drawPortrait(cv: Surface, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, PORTRAIT_BG);
  cv.rect(x, y, w, h, NAVY, 2);
  const cx = x + Math.floor(w / 2);
  // faint halo behind the head
  cv.fillCircle(cx, y + 62, 56, PORTRAIT_HALO);
  // head: one profile polygon (forehead, nose, lips, chin, jaw, neck),
  // then neck and shoulders — a single navy silhouette
  cv.fillPolygon(
    [
      [x + 76, y + 8], [x + 56, y + 14], [x + 44, y + 30], [x + 40, y + 52],
      [x + 44, y + 76], [x + 50, y + 96], [x + 54, y + 118], [x + 60, y + 128],
      [x + 92, y + 128], [x + 88, y + 112], [x + 98, y + 104], [x + 104, y + 96],
      [x + 100, y + 88], [x + 106, y + 82], [x + 102, y + 74], [x + 112, y + 66],
      [x + 104, y + 56], [x + 106, y + 44], [x + 100, y + 30], [x + 92, y + 16],
    ],
    NAVY,
  );
  cv.fillRect(cx - 15, y + 88, 30, 38, NAVY);
  cv.fillPolygon(
    [[x + 8, y + h - 2], [x + w - 8, y + h - 2], [x + w - 32, y + 122], [x + 32, y + 122]],
    NAVY,
  );
}

// ---------------- Field helper ----------------
function field(cv: Surface, x: number, y: number, label: string, value: string, valueScale = 3): void {
  cv.text(label, x, y, 2, LABEL);
  cv.text(value, x, y + 16, valueScale, INK);
}

// ---------------- Build the spread ----------------
function build(): Uint8Array {
  const cv = new Surface(1024, 1024, DESK);

  // Pages: left 8..508, right 516..1016, y 112..912. Spine gap shows desk.
  cv.fillRect(8, 112, 500, 800, PAPER_L);
  cv.fillRect(516, 112, 500, 800, PAPER_R);
  cv.vline(508, 112, 800, [20, 24, 28], 2);
  cv.vline(514, 112, 800, [20, 24, 28], 2);

  // ===== LEFT PAGE — data page =====
  // Emblem: ring + 8-point star, centred above the country name.
  cv.ring(258, 152, 17, 3, NAVY);
  cv.fillPolygon(starPoints(258, 152, 11, 5), NAVY);
  cv.textCentered("REPUBLIC OF CAELUM", 258, 180, 4, NAVY);
  cv.textCentered("PASSPORT", 258, 216, 3, NAVY);
  cv.hline(32, 246, 452, NAVY, 2);

  // Portrait box + first five fields.
  drawPortrait(cv, 32, 262, 150, 190);
  field(cv, 200, 262, "SURNAME", "KOVAC");
  field(cv, 200, 300, "GIVEN NAMES", "ELENA");
  field(cv, 200, 338, "NATIONALITY", "CAELUMIAN");
  field(cv, 200, 376, "DATE OF BIRTH", "14 MAR 1988");
  field(cv, 200, 414, "SEX", "F");

  // Remaining fields, full width.
  field(cv, 32, 478, "PLACE OF BIRTH", "CAELUM CITY");
  field(cv, 32, 536, "DATE OF ISSUE", "12 JUN 2023");
  field(cv, 270, 536, "DATE OF EXPIRY", "11 JUN 2033");
  field(cv, 32, 596, "AUTHORITY", "OBSERVATORY REGISTRY");
  field(cv, 32, 656, "DOCUMENT NO.", "CA4829173");

  // Holder signature (wavy ink line) + registry seal.
  for (let x = 32; x <= 250; x++) {
    const y = 716 + Math.round(3 * Math.sin((x - 32) / 9)) + Math.round(2 * Math.sin((x - 32) / 6 + 1));
    cv.set(x, y, NAVY);
    cv.set(x, y + 1, NAVY);
  }
  cv.text("SIGNATURE OF HOLDER", 32, 730, 2, LABEL);
  cv.ring(377, 720, 28, 2, NAVY);
  cv.fillPolygon(starPoints(377, 714, 10, 4), NAVY);
  cv.textCentered("CAE", 377, 732, 2, NAVY);

  // Machine-readable zone: white band, two lines, advance 11.
  cv.textCentered("MACHINE READABLE ZONE", 258, 772, 2, LABEL);
  cv.fillRect(8, 796, 500, 88, WHITE);
  cv.hline(8, 796, 500, NAVY, 2);
  cv.text(MRZ1, 16, 814, 2, INK, 11);
  cv.text(MRZ2, 16, 842, 2, INK, 11);

  // ===== RIGHT PAGE — visa page =====
  cv.textCentered("VISAS", 766, 150, 4, NAVY);
  cv.hline(540, 185, 452, NAVY, 2);

  // Eight stamps, 2 columns x 4 rows, each rotated +-4 degrees.
  const colX = [535, 765];
  const rowY = [205, 325, 445, 565];
  for (let i = 0; i < STAMPS.length; i++) {
    const s = STAMPS[i];
    const layer = makeStamp(s);
    const x = colX[i % 2], y = rowY[Math.floor(i / 2)];
    blitRotated(cv, layer, x + 110, y + 52, s.rot, s.ink, 0.8);
  }

  // Visa condition box — the telling detail of paperwork.
  cv.rect(532, 700, 468, 172, NAVY, 2);
  cv.rect(538, 706, 456, 160, NAVY, 1);
  cv.textCentered("CONDITION OF STAY", 766, 716, 3, NAVY);
  cv.hline(560, 744, 412, NAVY, 1);
  cv.textCentered("SUMMIT ZONE ONLY.", 766, 758, 2, INK);
  cv.textCentered("NO NIGHT DESCENT WITHOUT GUIDE.", 766, 782, 2, INK);
  cv.textCentered("ALTITUDE FEE PAID: 3,842 M.", 766, 806, 2, INK);
  cv.textCentered("ISSUED BY THE OBSERVATORY REGISTRY", 766, 830, 2, LABEL);

  cv.textCentered("VISAS - 8 STAMPS", 766, 892, 2, LABEL);

  return cv.px;
}

function main(): void {
  const rgb = build();
  const png = encodePNG(1024, 1024, rgb);
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.png", png);
}

main();
