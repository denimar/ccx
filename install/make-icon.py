#!/usr/bin/env python3
"""Renders install/icon.png. The committed PNG is what install.sh uses — this
script only needs running when the mark itself changes. Requires Pillow."""
from PIL import Image, ImageDraw

S = 512
BG      = (30, 30, 46, 255)      # base
EDGE    = (49, 50, 68, 255)      # surface
MAUVE   = (203, 166, 247, 255)
BLUE    = (137, 180, 250, 255)
GREEN   = (166, 227, 161, 255)
PEACH   = (250, 179, 135, 255)
MUTED   = (108, 112, 134, 255)

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

pad, radius = 26, 108
d.rounded_rectangle([pad, pad, S - pad, S - pad], radius=radius, fill=BG, outline=EDGE, width=6)

# the split: left pane (Claude), right pane (the HUD)
inner = [pad + 46, pad + 62, S - pad - 46, S - pad - 46]
split_x = inner[0] + int((inner[2] - inner[0]) * 0.42)
d.line([split_x, inner[1], split_x, inner[3]], fill=EDGE, width=7)

# left pane: a prompt caret over two dim lines
cx, cy = inner[0] + 26, inner[1] + 40
d.line([cx, cy - 22, cx + 26, cy], fill=MAUVE, width=14, joint="curve")
d.line([cx, cy + 22, cx + 26, cy], fill=MAUVE, width=14, joint="curve")
for i, w in enumerate((0.62, 0.42)):
    y = cy + 74 + i * 46
    d.rounded_rectangle([inner[0], y, inner[0] + int((split_x - inner[0] - 30) * w), y + 16], radius=8, fill=EDGE)

# right pane: HUD rows, each with a status dot
row_x = split_x + 34
colors = (GREEN, BLUE, MAUVE, PEACH, MUTED)
for i, c in enumerate(colors):
    y = inner[1] + 16 + i * 62
    d.ellipse([row_x, y, row_x + 22, y + 22], fill=c)
    w = (0.95, 0.78, 0.86, 0.62, 0.5)[i]
    d.rounded_rectangle([row_x + 40, y + 4, row_x + 40 + int((inner[2] - row_x - 46) * w), y + 18],
                        radius=7, fill=EDGE if i else MUTED)

img.save("install/icon.png")
for size in (256, 128, 64, 48):
    img.resize((size, size), Image.LANCZOS).save(f"install/icon-{size}.png")
print("wrote install/icon.png + 4 sizes")
