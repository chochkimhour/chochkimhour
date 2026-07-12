"""
Convert portrait photo → ASCII for the GitHub profile README.

Uses ascii-image-converter (TheZoraiz) with --complex --negative, which
produces the dense mixed-character style used on profiles like Andrew6rant:
https://github.com/Andrew6rant

Why --negative:
  This converter maps bright pixels to dense ink by default. Studio photos
  have a bright background, so we invert mapping so the face/hair become
  dense characters and the background becomes spaces (Andrew-style).
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "assets" / "portrait.png"
if not DEFAULT_SRC.exists():
    DEFAULT_SRC = Path(r"D:\Images\chochkimhour.png")

DEFAULT_OUT = ROOT / "assets" / "portrait_ascii.txt"
PRE_PATH = ROOT / "assets" / "_pre_face.png"

CANDIDATE_BINS = [
    ROOT / "tools" / "ascii-image-converter.exe",
    Path(os.environ.get("TEMP", ""))
    / "ascii-image-converter"
    / "ascii-image-converter_Windows_amd64_64bit"
    / "ascii-image-converter.exe",
    Path(shutil.which("ascii-image-converter") or ""),
]


def find_converter() -> Path | None:
    for p in CANDIDATE_BINS:
        if p and Path(p).exists():
            return Path(p)
    return None


def preprocess(
    src: Path,
    crop: tuple[float, float, float, float] = (0.18, 0.09, 0.82, 0.70),
    size: tuple[int, int] = (540, 640),
    contrast: float = 1.85,
) -> Path:
    """
    Prepare photo so facial structure survives ASCII:
    - tight head/shoulders crop
    - soft oval vignette on pure white
    - strong contrast + unsharp for eyes/hair edges
    """
    img = Image.open(src).convert("RGB")
    w, h = img.size
    l, t, r, b = crop
    img = img.crop((int(w * l), int(h * t), int(w * r), int(h * b)))
    img = img.resize(size, Image.Resampling.LANCZOS)

    # Soft oval (head + upper shoulders) — spaces outside like Andrew's art
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-48, -28, size[0] + 48, size[1] + 85), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(11))
    white = Image.new("RGB", size, (255, 255, 255))
    img = Image.composite(img, white, mask)

    g = ImageOps.grayscale(img)
    g = ImageOps.autocontrast(g, cutoff=2)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    g = ImageEnhance.Brightness(g).enhance(1.03)
    g = ImageEnhance.Sharpness(g).enhance(2.0)
    g = g.filter(ImageFilter.UnsharpMask(radius=1.6, percent=165, threshold=2))

    # Crush near-white to pure white → clean space background
    px = g.load()
    for y in range(size[1]):
        for x in range(size[0]):
            v = px[x, y]
            if v >= 238:
                px[x, y] = 255
            elif v <= 18:
                px[x, y] = 0

    PRE_PATH.parent.mkdir(parents=True, exist_ok=True)
    g.convert("RGB").save(PRE_PATH)
    return PRE_PATH


def convert_with_cli(bin_path: Path, width: int = 44) -> str:
    cmd = [
        str(bin_path),
        str(PRE_PATH),
        "--width",
        str(width),
        "--complex",
        "--negative",
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr or "ascii-image-converter failed")

    lines = [ln.rstrip() for ln in result.stdout.replace("\r\n", "\n").split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()

    # Drop fully empty trailing noise rows
    while lines and set(lines[-1].strip()) <= {"`", "'", ".", " ", '"', ",", "-", "~", ":", ";"}:
        if len(lines[-1].strip()) < 6:
            lines.pop()
        else:
            break

    width_max = max((len(ln) for ln in lines), default=width)
    return "\n".join(ln.ljust(width_max) for ln in lines)


FALLBACK_CHARS = r"""$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'. """


def convert_fallback(cols: int = 44, rows: int = 25) -> str:
    g = ImageOps.grayscale(Image.open(PRE_PATH))
    w, h = g.size
    n = len(FALLBACK_CHARS) - 1
    lines: list[str] = []
    for row in range(rows):
        y0 = int(row * h / rows)
        y1 = int((row + 1) * h / rows)
        chars: list[str] = []
        for col in range(cols):
            x0 = int(col * w / cols)
            x1 = int((col + 1) * w / cols)
            cell = g.crop((x0, y0, max(x0 + 1, x1), max(y0 + 1, y1)))
            lum = float(ImageStat.Stat(cell).mean[0])
            if lum >= 248:
                chars.append(" ")
                continue
            t = (lum / 255.0) ** 0.88
            idx = min(n, max(0, int(t * n + 0.5)))
            chars.append(FALLBACK_CHARS[idx])
        lines.append("".join(chars))
    while lines and set(lines[0]) <= {" "}:
        lines.pop(0)
    while lines and set(lines[-1]) <= {" "}:
        lines.pop()
    width_max = max(len(ln) for ln in lines)
    return "\n".join(ln.ljust(width_max) for ln in lines)


def to_ascii(src: Path, width: int = 44) -> str:
    preprocess(src)
    bin_path = find_converter()
    if bin_path is not None:
        try:
            return convert_with_cli(bin_path, width=width)
        except Exception as exc:  # noqa: BLE001
            print(f"CLI converter failed ({exc}); using fallback.")
    return convert_fallback(cols=width, rows=25)


def main() -> None:
    parser = argparse.ArgumentParser(description="Portrait → ASCII for profile README")
    parser.add_argument("--src", default=str(DEFAULT_SRC))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--width", type=int, default=44)
    # compat with older generate-profile-svg.mjs flags
    parser.add_argument("--cols", type=int, default=None)
    parser.add_argument("--rows", type=int, default=None)
    parser.add_argument("--contrast", type=float, default=1.85)
    parser.add_argument("--sharpness", type=float, default=2.0)
    parser.add_argument("--gamma", type=float, default=0.88)
    parser.add_argument("--bg-tolerance", type=float, default=0)
    args = parser.parse_args()

    width = args.cols or args.width
    art = to_ascii(Path(args.src), width=width)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(art + "\n", encoding="utf-8")
    print(art)
    print(f"\nWrote {out} ({len(art.splitlines())} rows)")
    print(f"Converter: {find_converter() or 'Pillow fallback'}")


if __name__ == "__main__":
    main()
