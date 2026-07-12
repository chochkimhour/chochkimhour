"""
Render a full neofetch-style profile card PNG (photo + terminal panel).

PNG is the reliable way to show your real face on GitHub READMEs
(SVG <image> is often sanitized away).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
AVATAR = ROOT / "assets" / "avatar.png"
PORTRAIT = ROOT / "assets" / "portrait.png"
OUT_DARK = ROOT / "assets" / "dark_mode.png"
OUT_LIGHT = ROOT / "assets" / "light_mode.png"

# Card size similar to Andrew's SVG proportions
W, H = 1000, 520

THEMES = {
    "dark": {
        "bg": (22, 27, 34),
        "text": (201, 209, 217),
        "key": (255, 166, 87),
        "value": (165, 214, 255),
        "cc": (97, 110, 127),
        "ring": (48, 54, 61),
    },
    "light": {
        "bg": (255, 255, 255),
        "text": (31, 35, 40),
        "key": (207, 34, 46),
        "value": (5, 80, 174),
        "cc": (140, 149, 159),
        "ring": (208, 215, 222),
    },
}

INFO_ROWS = [
    ("OS", "Windows, Linux"),
    ("Uptime", "on GitHub since Jun 2022"),
    ("Kernel", "Backend Developer"),
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

STATS = "Repos: 8  |  Followers: 4  |  Following: 3"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\cour.ttf",
        r"C:\Windows\Fonts\lucon.ttf",
    ):
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def circle_avatar(size: int = 300) -> Image.Image:
    src = AVATAR if AVATAR.exists() else PORTRAIT
    img = Image.open(src).convert("RGBA")
    if src == PORTRAIT:
        w, h = img.size
        side = int(min(w, h) * 0.62)
        cx, cy = w // 2, int(h * 0.38)
        left = max(0, cx - side // 2)
        top = max(0, cy - side // 2)
        img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    # ensure circular alpha
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    out.putalpha(mask)
    return out


def dots_for(label: str, value: str, width: int = 46) -> str:
    base = f"{label}: "
    n = max(2, width - len(base) - len(value))
    return "." * n


def draw_card(theme_name: str) -> Image.Image:
    t = THEMES[theme_name]
    img = Image.new("RGB", (W, H), t["bg"])
    draw = ImageDraw.Draw(img)
    # rounded rect border feel
    if theme_name == "light":
        draw.rounded_rectangle((1, 1, W - 2, H - 2), radius=14, outline=t["ring"], width=1)

    # Avatar
    avatar = circle_avatar(296)
    ax, ay = 28, (H - 296) // 2
    # ring
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((ax - 5, ay - 5, ax + 296 + 5, ay + 296 + 5), outline=t["ring"] + (255,), width=4)
    img = Image.alpha_composite(img.convert("RGBA"), ring).convert("RGB")
    draw = ImageDraw.Draw(img)
    img.paste(avatar, (ax, ay), avatar)

    font = load_font(15)
    font_bold = load_font(16)
    x = 370
    y = 32

    def text(s: str, fill, f=font):
        nonlocal y
        draw.text((x, y), s, font=f, fill=fill)

    # title
    draw.text((x, y), "choch@kimhour", font=font_bold, fill=t["text"])
    title_w = draw.textlength("choch@kimhour", font=font_bold)
    draw.text((x + title_w + 6, y), " " + "-" * 30, font=font, fill=t["cc"])
    y += 28

    for row in INFO_ROWS:
        if row is None:
            y += 10
            continue
        label, value = row
        # draw key in orange, dots gray, value blue
        prefix = ". "
        draw.text((x, y), prefix, font=font, fill=t["cc"])
        kx = x + draw.textlength(prefix, font=font)
        draw.text((kx, y), label, font=font, fill=t["key"])
        kx2 = kx + draw.textlength(label, font=font)
        mid = f": {dots_for(label, value)} "
        draw.text((kx2, y), mid, font=font, fill=t["cc"])
        vx = kx2 + draw.textlength(mid, font=font)
        draw.text((vx, y), value, font=font, fill=t["value"])
        y += 20

    y += 10
    draw.text((x, y), "- Contact", font=font_bold, fill=t["text"])
    cw = draw.textlength("- Contact", font=font_bold)
    draw.text((x + cw + 6, y), " " + "-" * 32, font=font, fill=t["cc"])
    y += 24

    for label, value in CONTACT:
        prefix = ". "
        draw.text((x, y), prefix, font=font, fill=t["cc"])
        kx = x + draw.textlength(prefix, font=font)
        draw.text((kx, y), label, font=font, fill=t["key"])
        kx2 = kx + draw.textlength(label, font=font)
        mid = f": {dots_for(label, value)} "
        draw.text((kx2, y), mid, font=font, fill=t["cc"])
        vx = kx2 + draw.textlength(mid, font=font)
        draw.text((vx, y), value, font=font, fill=t["value"])
        y += 20

    y += 10
    draw.text((x, y), "- GitHub Stats", font=font_bold, fill=t["text"])
    sw = draw.textlength("- GitHub Stats", font=font_bold)
    draw.text((x + sw + 6, y), " " + "-" * 28, font=font, fill=t["cc"])
    y += 24
    draw.text((x, y), f". {STATS}", font=font, fill=t["value"])

    return img


def main() -> None:
    # ensure avatar exists
    if not AVATAR.exists() and (ROOT / "scripts" / "make-avatar.py").exists():
        import subprocess

        subprocess.run(["python", str(ROOT / "scripts" / "make-avatar.py")], check=False)

    for name, out in (("dark", OUT_DARK), ("light", OUT_LIGHT)):
        card = draw_card(name)
        card.save(out, optimize=True)
        print(f"Wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
