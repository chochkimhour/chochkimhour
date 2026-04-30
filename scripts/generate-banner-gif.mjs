import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const width = 1000;
const height = 320;
const frames = 24;
const delayCs = 6;
const outFile = resolve('assets', 'coding-banner.gif');

const palette = [];
const add = (r, g, b) => {
  palette.push([r, g, b]);
  return palette.length - 1;
};

const bgStart = add(7, 11, 22);
const bgMid = add(16, 26, 58);
const bgEnd = add(36, 16, 68);
const panel = add(15, 23, 42);
const panel2 = add(17, 24, 39);
const border = add(37, 59, 117);
const cyan = add(56, 189, 248);
const purple = add(139, 92, 246);
const pink = add(244, 114, 182);
const green = add(52, 211, 153);
const yellow = add(251, 191, 36);
const red = add(248, 113, 113);
const white = add(229, 231, 235);
const muted = add(148, 163, 184);
const dark = add(11, 16, 32);
const shadow = add(4, 8, 18);

while (palette.length < 256) {
  const t = (palette.length - 16) / 239;
  const wave = Math.sin(t * Math.PI);
  palette.push([
    Math.round(7 + 49 * t + 12 * wave),
    Math.round(11 + 178 * t),
    Math.round(22 + 226 * (1 - Math.abs(t - 0.55))),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
};

const nearest = (() => {
  const cache = new Map();
  return (rgb) => {
    const key = rgb.join(',');
    if (cache.has(key)) return cache.get(key);

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const d = dist(rgb, palette[i]);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    cache.set(key, best);
    return best;
  };
})();

const rgbIndex = (r, g, b) => nearest([Math.round(r), Math.round(g), Math.round(b)]);

const put = (pixels, x, y, color) => {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    pixels[y * width + x] = color;
  }
};

const rect = (pixels, x, y, w, h, color) => {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy += 1) {
    pixels.fill(color, yy * width + x0, yy * width + x1);
  }
};

const strokeRect = (pixels, x, y, w, h, color) => {
  rect(pixels, x, y, w, 2, color);
  rect(pixels, x, y + h - 2, w, 2, color);
  rect(pixels, x, y, 2, h, color);
  rect(pixels, x + w - 2, y, 2, h, color);
};

const circle = (pixels, cx, cy, r, color) => {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) {
        put(pixels, x, y, color);
      }
    }
  }
};

const line = (pixels, x0, y0, x1, y1, color, thickness = 2) => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(lerp(x0, x1, t));
    const y = Math.round(lerp(y0, y1, t));
    rect(pixels, x - thickness / 2, y - thickness / 2, thickness, thickness, color);
  }
};

const glyphs = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const text = (pixels, value, x, y, color, scale = 2) => {
  let cursor = x;
  for (const raw of value.toUpperCase()) {
    const glyph = glyphs[raw] ?? glyphs[' '];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') {
          rect(pixels, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
};

const lzwEncode = (indices, minCodeSize) => {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  const output = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer += code * 2 ** bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer % 256);
      bitBuffer = Math.floor(bitBuffer / 256);
      bitCount -= 8;
    }
  };

  const reset = () => {
    codeSize = minCodeSize + 1;
    writeCode(clear);
  };

  writeCode(clear);

  for (let i = 0; i < indices.length; i += 1) {
    if (i > 0 && i % 200 === 0) {
      reset();
    }
    writeCode(indices[i]);
  }

  writeCode(end);

  if (bitCount > 0) output.push(bitBuffer % 256);
  return Buffer.from(output);
};

const blocks = (data) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.subarray(i, i + 255);
    chunks.push(Buffer.from([chunk.length]), chunk);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
};

const u16 = (value) => Buffer.from([value & 255, (value >> 8) & 255]);

const makeFrame = (frame) => {
  const pixels = new Uint8Array(width * height);
  const phase = frame / frames;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tx = x / width;
      const ty = y / height;
      const glow = 0.08 * Math.sin((tx + phase) * Math.PI * 2);
      const r = lerp(7, lerp(16, 36, tx), ty) + 32 * glow;
      const g = lerp(11, lerp(26, 16, tx), ty) + 18 * glow;
      const b = lerp(22, lerp(58, 68, tx), ty) + 32 * glow;
      pixels[y * width + x] = rgbIndex(r, g, b);
    }
  }

  for (let i = 0; i < 10; i += 1) {
    const x = (i * 137 + frame * 5) % (width + 80) - 40;
    const y = 50 + ((i * 41 + frame * 3) % 220);
    circle(pixels, x, y, 2 + (i % 3), [cyan, purple, pink][i % 3]);
  }

  line(pixels, 80, 56, 920, 56, purple, 2);
  line(pixels, 80, 264, 920, 264, cyan, 2);

  rect(pixels, 78, 70, 844, 176, shadow);
  rect(pixels, 90, 62, 820, 190, dark);
  strokeRect(pixels, 90, 62, 820, 190, border);

  rect(pixels, 112, 84, 290, 130, panel);
  strokeRect(pixels, 112, 84, 290, 130, border);
  text(pixels, 'CHOCH KIMHOUR', 136, 110, white, 3);
  text(pixels, 'BACKEND DEVELOPER', 138, 154, cyan, 3);
  line(pixels, 138, 196, 368, 196, purple, 4);
  line(pixels, 138, 210, 318, 210, pink, 4);

  rect(pixels, 450, 84, 410, 130, panel2);
  strokeRect(pixels, 450, 84, 410, 130, border);
  rect(pixels, 450, 84, 410, 28, border);
  circle(pixels, 472, 98, 5, red);
  circle(pixels, 492, 98, 5, yellow);
  circle(pixels, 512, 98, 5, green);
  text(pixels, 'API/ROUTES.TS', 540, 91, muted, 2);

  const lines = [
    ['EXPORT ASYNC FUNCTION CREATEAPI', cyan],
    ['VALIDATE REQUEST', yellow],
    ['RETURN RESPONSE.OK DATA', green],
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const [value, color] = lines[i];
    const visible = Math.min(value.length, Math.max(0, Math.floor((phase * 2.2 - i * 0.33) * value.length)));
    text(pixels, value.slice(0, visible), 482, 132 + i * 32, color, 2);
  }

  const cursorX = 482 + ((Math.floor(phase * 32) % 18) * 12);
  if (frame % 12 < 7) {
    rect(pixels, cursorX, 196, 4, 15, white);
  }

  const sweepX = Math.floor(90 + phase * 820);
  for (let x = sweepX - 22; x < sweepX + 22; x += 1) {
    const alpha = 1 - Math.abs(x - sweepX) / 22;
    const color = rgbIndex(56 + 45 * alpha, 189 + 22 * alpha, 248);
    line(pixels, x, 64, x - 80, 250, color, 1);
  }

  return pixels;
};

const parts = [
  Buffer.from('GIF89a', 'ascii'),
  u16(width),
  u16(height),
  Buffer.from([0xf7, 0, 0]),
  Buffer.from(palette.flat()),
  Buffer.from([0x21, 0xff, 0x0b]),
  Buffer.from('NETSCAPE2.0', 'ascii'),
  Buffer.from([3, 1, 0, 0, 0]),
];

for (let i = 0; i < frames; i += 1) {
  const frame = makeFrame(i);
  parts.push(
    Buffer.from([0x21, 0xf9, 4, 0x04]),
    u16(delayCs),
    Buffer.from([0, 0]),
    Buffer.from([0x2c]),
    u16(0),
    u16(0),
    u16(width),
    u16(height),
    Buffer.from([0]),
    Buffer.from([8]),
    blocks(lzwEncode(frame, 8)),
  );
}

parts.push(Buffer.from([0x3b]));
writeFileSync(outFile, Buffer.concat(parts));
console.log(`Generated ${outFile}`);
