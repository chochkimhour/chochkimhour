"""Create a square face-cropped avatar PNG for the profile SVG."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "portrait.png"
if not SRC.exists():
    SRC = Path(r"D:\Images\chochkimhour.png")
OUT = ROOT / "assets" / "avatar.png"


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    w, h = img.size
    # Face-focused square crop (head + a bit of shoulders)
    side = int(min(w, h) * 0.62)
    cx, cy = w // 2, int(h * 0.38)
    left = max(0, cx - side // 2)
    top = max(0, cy - side // 2)
    right = min(w, left + side)
    bottom = min(h, top + side)
    img = img.crop((left, top, right, bottom))
    img = img.resize((360, 360), Image.Resampling.LANCZOS)
    img = ImageOps.autocontrast(img, cutoff=1)

    # Soft circular alpha (for previews; SVG also clips)
    mask = Image.new("L", (360, 360), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((2, 2, 357, 357), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(OUT, optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
