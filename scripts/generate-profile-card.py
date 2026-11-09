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

# Card layout: info panel only
W, H = 520, 480
PAD = 20
FONT_SIZE = 15

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


def dots_for(label: str, value: str, width: int = 46) -> str:
    base = f"{label}: "
    return "." * max(2, width - len(base) - len(value))


def draw_card(theme_name: str, stats: str) -> Image.Image:
    t = THEMES[theme_name]
    img = Image.new("RGB", (W, H), t["bg"])
    draw = ImageDraw.Draw(img)
    font = load_font(FONT_SIZE)
    font_sm = load_font(FONT_SIZE)

    if t["border"]:
        draw.rounded_rectangle((1, 1, W - 2, H - 2), radius=14, outline=t["border"], width=1)

    # --- Neofetch panel, vertically centred ---
    content_h = 28 + 5 * 20 + 10 + 3 * 20 + 10 + 3 * 20 + 12 + 28 + 3 * 20 + 12 + 28 + 18
    right_x = PAD
    y = (H - content_h) // 2

    def title(label: str, dashes: int = 32) -> None:
        nonlocal y
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

    title("choch@kimhour", 32)

    for item in INFO_ROWS:
        if item is None:
            y += 10
            continue
        row(*item)

    y += 12
    title("- Contact", 35)
    for item in CONTACT:
        row(*item)

    y += 12
    title("- GitHub Stats", 30)
    draw.text((right_x, y), f". {stats}", font=font_sm, fill=t["value"])


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
