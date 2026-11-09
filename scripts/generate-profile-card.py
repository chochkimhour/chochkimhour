"""
Render Andrew6rant-style profile card as PNG.

Why PNG (not SVG alone)?
  GitHub replaces monospaced fonts and scales SVG text unpredictably, so the
  ASCII column width/height drift and the face becomes a noisy gray block.
  A baked PNG looks the same locally and on GitHub.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASCII_SRC = ROOT / "assets" / "choch_kimhour.txt"
ASCII_SRC_LIGHT = ROOT / "assets" / "choch_kimhour_light.txt"
OUT_DARK = ROOT / "assets" / "dark_mode.png"
OUT_LIGHT = ROOT / "assets" / "light_mode.png"
STATS_SRC = ROOT / "assets" / "github-stats.json"

# Card layout (close to Andrew6rant proportions)
W, H = 980, 520
PAD = 20
ASCII_COLS = 44
ASCII_ROWS = 26
FONT_SIZE = 15
LINE_H = 18  # fixed monospaced row pitch

THEMES = {
    "dark": {
        "bg": (22, 27, 34),
        "text": (201, 209, 217),
        "key": (255, 166, 87),
        "value": (165, 214, 255),
        "cc": (97, 110, 127),
        "ascii": (201, 209, 217),
        "border": None,
    },
    "light": {
        "bg": (255, 255, 255),
        "text": (31, 35, 40),
        "key": (207, 34, 46),
        "value": (5, 80, 174),
        "cc": (140, 149, 159),
        "ascii": (36, 41, 47),
        "border": (208, 215, 222),
    },
}

def load_stats() -> dict:
    return json.loads(STATS_SRC.read_text(encoding="utf-8")) if STATS_SRC.exists() else {}


def fmt(n) -> str:
    return f"{n:,}" if isinstance(n, int) else "?"


def uptime_since(iso: str | None) -> str:
    if not iso:
        return "on GitHub since Jun 2022"
    start = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    months = (now.year - start.year) * 12 + now.month - start.month - (now.day < start.day)
    y, m = divmod(months, 12)
    return f"{y} year{'' if y == 1 else 's'}, {m} month{'' if m == 1 else 's'}"


def stats_lines(stats: dict) -> list[str]:
    return [
        f"Repos: {fmt(stats.get('repos'))}  |  Stars: {fmt(stats.get('stars'))}  |  Followers: {fmt(stats.get('followers'))}",
        f"Commits: {fmt(stats.get('commits'))}  |  Contributions (1y): {fmt(stats.get('contributions'))}",
    ]


STATS = load_stats()

INFO_ROWS = [
    ("OS", "Windows, Linux"),
    ("Uptime", uptime_since(STATS.get("createdAt"))),
    ("Kernel", "Software Developer"),
    ("IDE", "VS Code, IntelliJ IDEA"),
    ("Location", "Phnom Penh, Cambodia"),
    None,
    ("Languages.Programming", "Java, JavaScript, Python, Groovy"),
    ("Languages.Computer", "HTML, CSS, JSON, YAML"),
    ("Languages.Real", "Khmer, English"),
    None,
    ("Stack.Backend", "NestJS, Spring Boot, Grails, Express"),
    ("Stack.Database", "MySQL, PostgreSQL, Redis"),
    ("Hobbies.Software", "npm packages, CLI tools, open source"),
]

CONTACT = [
    ("LinkedIn", "choch-kimhour"),
    ("Portfolio", "chochkimhour.github.io/my-portfolio"),
    ("npm", "~chochkimhour"),
]

# Wide enough for the longest row so every value ends in the same column.
LINE_WIDTH = max(len(k) + len(v) for k, v in [r for r in INFO_ROWS if r] + CONTACT) + 6


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\cour.ttf",
        r"C:\Windows\Fonts\lucon.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ):
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def pad_right(s: str, width: int) -> str:
    return s[:width].ljust(width)


def downsample(lines: list[str], cols: int, rows: int) -> list[str]:
    src_rows = len(lines)
    src_cols = max(len(l) for l in lines)
    grid = [pad_right(l, src_cols) for l in lines]
    out: list[str] = []
    for r in range(rows):
        sr = min(src_rows - 1, int((r + 0.5) * src_rows / rows))
        row = []
        for c in range(cols):
            sc = min(src_cols - 1, int((c + 0.5) * src_cols / cols))
            row.append(grid[sr][sc])
        out.append("".join(row))
    return out


def dots_for(label: str, value: str, width: int = LINE_WIDTH) -> str:
    base = f"{label}: "
    return "." * max(2, width - len(base) - len(value))


def load_ascii(theme_name: str) -> list[str]:
    src = ASCII_SRC_LIGHT if theme_name == "light" and ASCII_SRC_LIGHT.exists() else ASCII_SRC
    raw = src.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    while raw and not raw[-1].strip():
        raw.pop()
    return downsample(raw, ASCII_COLS, ASCII_ROWS)


def draw_card(theme_name: str) -> Image.Image:
    t = THEMES[theme_name]
    img = Image.new("RGB", (W, H), t["bg"])
    draw = ImageDraw.Draw(img)
    font = load_font(FONT_SIZE)
    font_sm = load_font(FONT_SIZE)

    if t["border"]:
        draw.rounded_rectangle((1, 1, W - 2, H - 2), radius=14, outline=t["border"], width=1)

    # Measure monospaced cell from the real font GitHub-equivalent (Consolas)
    sample = "M" * 10
    bbox = draw.textbbox((0, 0), sample, font=font)
    char_w = (bbox[2] - bbox[0]) / 10

    ascii_lines = load_ascii(theme_name)
    left_x = PAD
    # Right panel starts after ASCII block + gap
    right_x = int(left_x + ASCII_COLS * char_w + 36)

    # --- Left: ASCII portrait ---
    # Vertically center ASCII block
    ascii_block_h = (ASCII_ROWS - 1) * LINE_H
    right_block_h = 28 + 5 * 20 + 12 + 3 * 20 + 12 + 3 * 20 + 14 + 24 + 3 * 20 + 14 + 24 + 20 + 8
    content_h = max(ascii_block_h, right_block_h)
    top = (H - content_h) // 2

    y = top
    for line in ascii_lines:
        draw.text((left_x, y), line, font=font, fill=t["ascii"])
        y += LINE_H

    # --- Right: neofetch panel ---
    y = top

    def title(label: str) -> None:
        nonlocal y
        # Row text is ". " + LINE_WIDTH chars + " "; end the rule in the same column.
        dashes = LINE_WIDTH + 3 - len(label) - 2
        draw.text((right_x, y), label, font=font, fill=t["text"])
        tw = draw.textlength(label, font=font)
        draw.text((right_x + tw + 6, y), " " + ("-" * dashes), font=font_sm, fill=t["cc"])
        y += 28

    def row(key: str, value: str) -> None:
        nonlocal y
        prefix = ". "
        draw.text((right_x, y), prefix, font=font_sm, fill=t["cc"])
        x = right_x + draw.textlength(prefix, font=font_sm)
        draw.text((x, y), key, font=font_sm, fill=t["key"])
        x += draw.textlength(key, font=font_sm)
        mid = f": {dots_for(key, value)} "
        draw.text((x, y), mid, font=font_sm, fill=t["cc"])
        x += draw.textlength(mid, font=font_sm)
        draw.text((x, y), value, font=font_sm, fill=t["value"])
        y += 20

    title("choch@kimhour")

    for item in INFO_ROWS:
        if item is None:
            y += 10
            continue
        row(*item)

    y += 12
    title("- Contact")
    for item in CONTACT:
        row(*item)

    y += 12
    title("- GitHub Stats")
    for line in stats_lines(STATS):
        draw.text((right_x, y), f". {line}", font=font_sm, fill=t["value"])
        y += 20


    return img


def main() -> None:
    if not ASCII_SRC.exists():
        raise SystemExit(f"Missing {ASCII_SRC}")

    for name, out in (("dark", OUT_DARK), ("light", OUT_LIGHT)):
        card = draw_card(name)
        card.save(out, optimize=True)
        print(f"Wrote {out} ({out.stat().st_size} bytes) size={card.size}")


if __name__ == "__main__":
    main()
