"""Convert a portrait image to dense ASCII art for the profile README SVG."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


# Dense ramp (dark -> light).
CHARS = r"""M@%#W$8&B*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'. """


def to_ascii(
    src: Path,
    cols: int = 40,
    rows: int = 24,
    contrast: float = 2.35,
    sharpness: float = 2.6,
    crop: tuple[float, float, float, float] = (0.25, 0.15, 0.75, 0.60),
    gamma: float = 0.68,
    bg_bias: float = 8.0,
) -> str:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    left, top, right, bottom = crop
    img = img.crop((int(w * left), int(h * top), int(w * right), int(h * bottom)))
    img = img.resize((cols, rows), Image.Resampling.LANCZOS)

    g = ImageOps.grayscale(img)
    g = ImageOps.autocontrast(g, cutoff=2)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    g = ImageEnhance.Sharpness(g).enhance(sharpness)
    g = g.filter(ImageFilter.SHARPEN)

    pixels = list(g.get_flattened_data())
    # Estimate studio background from border samples
    samples = [
        pixels[0],
        pixels[cols - 1],
        pixels[-cols],
        pixels[-1],
        pixels[cols // 2],
        pixels[cols // 2 + (rows - 1) * cols],
    ]
    bg = sum(samples) / len(samples)

    lines: list[str] = []
    n = len(CHARS) - 1
    for y in range(rows):
        row: list[str] = []
        for x in range(cols):
            p = float(pixels[y * cols + x])
            # Soft wash for gray backdrop / white shirt highlights
            if p > bg - bg_bias and p > 190:
                row.append(" ")
                continue
            t = (p / 255.0) ** gamma
            idx = min(n, max(0, int(t * n)))
            row.append(CHARS[idx])
        # keep trailing spaces for fixed SVG width
        lines.append("".join(row))
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    default_src = Path(__file__).resolve().parent.parent / "assets" / "portrait.png"
    if not default_src.exists():
        default_src = Path(r"D:\Images\chochkimhour.png")
    parser.add_argument("--src", default=str(default_src))
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent.parent / "assets" / "portrait_ascii.txt"),
    )
    parser.add_argument("--cols", type=int, default=40)
    parser.add_argument("--rows", type=int, default=24)
    parser.add_argument("--contrast", type=float, default=2.35)
    parser.add_argument("--sharpness", type=float, default=2.6)
    parser.add_argument("--gamma", type=float, default=0.68)
    args = parser.parse_args()

    art = to_ascii(
        Path(args.src),
        cols=args.cols,
        rows=args.rows,
        contrast=args.contrast,
        sharpness=args.sharpness,
        gamma=args.gamma,
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(art + "\n", encoding="utf-8")
    print(art)
    print(f"\nWrote {out} ({args.cols}x{args.rows})")


if __name__ == "__main__":
    main()
