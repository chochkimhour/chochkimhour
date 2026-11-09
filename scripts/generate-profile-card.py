"""
Render the neofetch-style profile info card as PNG.

Why PNG (not SVG alone)?
  GitHub replaces monospaced fonts and scales SVG text unpredictably, so the
  dotted columns drift. A baked PNG looks the same locally and on GitHub.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DARK = ROOT / "assets" / "dark_mode.png"
OUT_LIGHT = ROOT / "assets" / "light_mode.png"

# Card layout: two columns; width/height are derived from the content
PAD = 24
GAP = 36  # space between columns
FONT_SIZE = 15
TITLE_H, ROW_H, SPACER_H, SECTION_GAP = 28, 20, 10, 12
STATS_GAP = 18  # space above the centred stats line

THEMES = {
    "dark": {
        "bg": (22, 27, 34),
        "text": (201, 209, 217),
        "key": (255, 166, 87),
        "value": (165, 214, 255),
        "cc": (97, 110, 127),
        "border": None,
    },
    "light": {
        "bg": (255, 255, 255),
        "text": (31, 35, 40),
        "key": (207, 34, 46),
        "value": (5, 80, 174),
        "cc": (140, 149, 159),
        "border": (208, 215, 222),
    },
}

# Left column (under the user title). None = small spacer.
INFO_ROWS = [
    ("OS", "Windows, Linux"),
    ("Uptime", "on GitHub since Jun 2022"),
    ("Kernel", "Software Developer"),
    ("IDE", "VS Code, IntelliJ IDEA"),
    ("Location", "Phnom Penh, Cambodia"),
    None,
    ("Languages.Programming", "Java, JavaScript, Python, Groovy"),
    ("Languages.Computer", "HTML, CSS, JSON, YAML"),
    ("Languages.Real", "Khmer, English"),
]

# Right column, top section
STACK_ROWS = [
    ("Stack.Backend", "NestJS, Spring Boot, Grails, Express"),
    ("Stack.Database", "MySQL, PostgreSQL, Redis"),
    ("Hobbies.Software", "npm packages, CLI tools, open source"),
]

CONTACT = [
    ("LinkedIn", "choch-kimhour"),
    ("Portfolio", "chochkimhour.github.io/my-portfolio"),
    ("npm", "~chochkimhour"),
]

GITHUB_USER = os.environ.get("GITHUB_USERNAME") or "chochkimhour"
FALLBACK_STATS = "Repos: 8  |  Followers: 4  |  Following: 3"


def fetch_stats() -> str:
    headers = {"User-Agent": "profile-card-generator", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"https://api.github.com/users/{GITHUB_USER}", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            u = json.load(res)
        return f"Repos: {u['public_repos']}  |  Followers: {u['followers']}  |  Following: {u['following']}"
    except Exception as err:  # network/API failure should not block card generation
        print(f"GitHub stats fetch failed ({err}); using fallback.")
        return FALLBACK_STATS


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


def column_width(rows: list[tuple[str, str] | None]) -> int:
    """Characters between ". " and the row end, wide enough that every value ends in one column."""
    return max(len(k) + len(v) for k, v in filter(None, rows)) + 4


def dots_for(label: str, value: str, width: int) -> str:
    base = f"{label}: "
    return "." * max(2, width - len(base) - len(value))


LEFT_W = column_width(INFO_ROWS)
RIGHT_W = column_width(STACK_ROWS + CONTACT)


def draw_card(theme_name: str, stats: str) -> Image.Image:
    t = THEMES[theme_name]
    font = load_font(FONT_SIZE)
    char_w = font.getlength("M")

    # Row text is ". " + width + " "
    left_px = (LEFT_W + 3) * char_w
    right_px = (RIGHT_W + 3) * char_w
    left_x = PAD
    right_x = int(left_x + left_px + GAP)
    W = int(right_x + right_px + PAD)

    left_h = TITLE_H + sum(SPACER_H if r is None else ROW_H for r in INFO_ROWS)
    right_h = TITLE_H + len(STACK_ROWS) * ROW_H + SECTION_GAP + TITLE_H + len(CONTACT) * ROW_H
    columns_h = max(left_h, right_h)
    # Stats line sits centred under both columns.
    H = columns_h + STATS_GAP + ROW_H + 2 * PAD + 8

    img = Image.new("RGB", (W, H), t["bg"])
    draw = ImageDraw.Draw(img)

    if t["border"]:
        draw.rounded_rectangle((1, 1, W - 2, H - 2), radius=14, outline=t["border"], width=1)

    def title(x: int, y: int, label: str, width: int) -> int:
        draw.text((x, y), label, font=font, fill=t["text"])
        tw = draw.textlength(label, font=font)
        # End the rule in the same column as the row values.
        draw.text((x + tw + 6, y), " " + "-" * (width + 1 - len(label)), font=font, fill=t["cc"])
        return y + TITLE_H

    def row(x: int, y: int, key: str, value: str, width: int) -> int:
        prefix = ". "
        draw.text((x, y), prefix, font=font, fill=t["cc"])
        x += draw.textlength(prefix, font=font)
        draw.text((x, y), key, font=font, fill=t["key"])
        x += draw.textlength(key, font=font)
        mid = f": {dots_for(key, value, width)} "
        draw.text((x, y), mid, font=font, fill=t["cc"])
        x += draw.textlength(mid, font=font)
        draw.text((x, y), value, font=font, fill=t["value"])
        return y + ROW_H

    top = PAD + 8

    # --- Left column ---
    y = title(left_x, top, "choch@kimhour", LEFT_W)
    for item in INFO_ROWS:
        y = y + SPACER_H if item is None else row(left_x, y, *item, LEFT_W)

    # --- Right column ---
    y = title(right_x, top, "- Stack", RIGHT_W)
    for item in STACK_ROWS:
        y = row(right_x, y, *item, RIGHT_W)

    y = title(right_x, y + SECTION_GAP, "- Contact", RIGHT_W)
    for item in CONTACT:
        y = row(right_x, y, *item, RIGHT_W)

    # --- GitHub stats, centred across the card ---
    line = f". {stats}"
    stats_x = (W - draw.textlength(line, font=font)) / 2
    draw.text((stats_x, top + columns_h + STATS_GAP), line, font=font, fill=t["value"])

    return img


def main() -> None:
    stats = fetch_stats()
    print(f"GitHub stats: {stats}")
    for name, out in (("dark", OUT_DARK), ("light", OUT_LIGHT)):
        card = draw_card(name, stats)
        card.save(out, optimize=True)
        print(f"Wrote {out} ({out.stat().st_size} bytes) size={card.size}")


if __name__ == "__main__":
    main()
