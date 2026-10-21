"""Arma assets/titulos/atlas-hub-title.webp con la letra de atlas-studio-title.webp.

«ATLAS» y la «U» salen recortados del título de Atlas Studio; la «H» y la «B», que
no están en ese título, se dibujan con la misma geometría (trazos de 36 px,
esquinas a 45°) y el mismo color.
Uso: python tools/make_hub_title.py
"""
from PIL import Image, ImageDraw

SRC = "assets/titulos/atlas-studio-title.webp"
OUT = "assets/titulos/atlas-hub-title.webp"
H = 134            # alto de las letras
COLOR = (241, 186, 66, 255)
K = 4              # sobremuestreo para que los bordes dibujados queden suaves

src = Image.open(SRC).convert("RGBA")
atlas = src.crop((0, 0, 553, H))
u = src.crop((818, 0, 920, H))


def letter(width, polys):
    big = Image.new("RGBA", (width * K, H * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    for poly, fill in polys:
        d.polygon([(x * K, y * K) for x, y in poly], fill=fill)
    return big.resize((width, H), Image.LANCZOS)


hole = (0, 0, 0, 0)
h = letter(102, [
    ([(0, 0), (36, 0), (36, H), (0, H)], COLOR),
    ([(66, 0), (102, 0), (102, H), (66, H)], COLOR),
    ([(36, 49), (66, 49), (66, 85), (36, 85)], COLOR),
])
b = letter(102, [
    # contorno como la D, con una muesca a la derecha en la mitad
    ([(0, 0), (76, 0), (102, 24), (102, 54), (92, 67), (102, 80), (102, 110), (78, H), (0, H)], COLOR),
    ([(36, 33), (66, 33), (66, 56), (36, 56)], hole),
    ([(36, 78), (66, 78), (66, 101), (36, 101)], hole),
])

parts = [(atlas, 0), (h, 55), (u, 12), (b, 12)]
width = sum(img.width + gap for img, gap in parts)
out = Image.new("RGBA", (width, H), (0, 0, 0, 0))
x = 0
for img, gap in parts:
    x += gap
    out.alpha_composite(img, (x, 0))
    x += img.width
out.save(OUT, lossless=True)
print(OUT, out.size)
