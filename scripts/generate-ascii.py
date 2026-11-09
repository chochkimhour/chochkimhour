"""
Convert a headshot into the ASCII portrait used by the profile cards.

Source: assets/photo.jpg (or .png) if present, else the GitHub avatar of
GITHUB_USERNAME. The plain background is detected from the image border and
blanked, so only the person is drawn.

Writes assets/choch_kimhour.txt (light glyphs on dark) and
assets/choch_kimhour_light.txt (dark ink on white) at the cards' exact grid size,
so the card generators' downsampling is a no-op.

Usage: python scripts/generate-ascii.py
"""

from __future__ import annotations

import io
import json
import os
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT_DARK = ROOT / "assets" / "choch_kimhour.txt"
OUT_LIGHT = ROOT / "assets" / "choch_kimhour_light.txt"
PHOTO_CANDIDATES = [ROOT / "assets" / "photo.jpg", ROOT / "assets" / "photo.png"]
GITHUB_USER = os.environ.get("GITHUB_USERNAME") or "chochkimhour"

# Must match ASCII_COLS / ASCII_ROWS in the card generators.
COLS, ROWS = 44, 26
# Monospace cell is ~8.25px wide x 18px tall in the cards.
CELL_ASPECT = 8.25 / 18

# Sparse -> dense. The dark card maps bright pixels to dense glyphs; the light
# card inverts that, since its glyphs are dark ink.
RAMP = " .,:;-=+*#%@"
BG_TOLERANCE = 30  # max RGB distance from the backdrop still treated as background
CONTRAST = 1.2
# Framing as fractions of the photo height: start a little above the hair, stop at the chest.
CROP_TOP = 0.08
CROP_HEIGHT = 0.80


def load_photo() -> Image.Image:
    for p in PHOTO_CANDIDATES:
        if p.exists():
            return Image.open(p).convert("RGB")
    req = urllib.request.Request(
        f"https://api.github.com/users/{GITHUB_USER}", headers={"User-Agent": "profile-card-generator"}
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        avatar_url = json.load(res)["avatar_url"]
    with urllib.request.urlopen(f"{avatar_url}&s=460", timeout=15) as res:
        return Image.open(io.BytesIO(res.read())).convert("RGB")


def crop_to_grid(img: Image.Image) -> Image.Image:
    """Crop to the grid's on-screen aspect ratio, framed on head and shoulders."""
    target = (COLS * CELL_ASPECT) / ROWS  # width / height in source pixels
    w, h = img.size
    crop_h = int(h * CROP_HEIGHT)
    crop_w = min(w, int(crop_h * target))
    left = (w - crop_w) // 2
    top = int(h * CROP_TOP)
    return img.crop((left, top, left + crop_w, top + crop_h))


def background_at(img: Image.Image) -> list[list[tuple[int, int, int]]]:
    """Per-pixel background estimate, interpolated between each row's edge colours.

    Studio backdrops are rarely flat, so a single border colour misses the gradient.
    """
    w, h = img.size
    px = img.load()
    edge = max(1, w // 20)

    def avg(xs: range, y: int) -> tuple[float, float, float]:
        cs = [px[x, y] for x in xs]
        return tuple(sum(c[i] for c in cs) / len(cs) for i in range(3))

    def dist(a, b) -> float:
        return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5

    # Lower rows reach the shoulders at the edges; once an edge stops looking like
    # backdrop, keep using the last backdrop colour seen on that side.
    lft, rgt = avg(range(edge), 0), avg(range(w - edge, w), 0)
    grid = []
    for y in range(h):
        row_l, row_r = avg(range(edge), y), avg(range(w - edge, w), y)
        if dist(row_l, lft) < BG_TOLERANCE:
            lft = row_l
        if dist(row_r, rgt) < BG_TOLERANCE:
            rgt = row_r
        grid.append([tuple(lft[i] + (rgt[i] - lft[i]) * x / (w - 1) for i in range(3)) for x in range(w)])
    return grid


def to_ascii(img: Image.Image, invert: bool = False) -> list[str]:
    small = crop_to_grid(img).resize((COLS, ROWS), Image.LANCZOS)
    bg = background_at(small)
    colour = small.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b = colour[x, y]
        br, bgc, bb = bg[y][x]
        return ((r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2) ** 0.5 < BG_TOLERANCE

    gray = ImageEnhance.Contrast(ImageOps.autocontrast(small.convert("L"), cutoff=2)).enhance(CONTRAST)
    lum = gray.load()
    lines = []
    for y in range(ROWS):
        row = []
        for x in range(COLS):
            if is_bg(x, y):
                row.append(" ")
                continue
            # Subject pixels never map to the blank glyph, so dark hair stays visible.
            v = 255 - lum[x, y] if invert else lum[x, y]
            row.append(RAMP[1 + v * (len(RAMP) - 1) // 256])
        lines.append("".join(row).rstrip())
    return lines


def main() -> None:
    photo = load_photo()
    for out, invert in ((OUT_DARK, False), (OUT_LIGHT, True)):
        lines = to_ascii(photo, invert)
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"Wrote {out} ({COLS}x{ROWS})")


if __name__ == "__main__":
    main()
