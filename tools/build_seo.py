"""Genera sitemap.xml y los datos estructurados (JSON-LD) de la portada.

- sitemap.xml: todas las páginas públicas con su URL canónica (con barra final)
  y la fecha del último commit que las tocó.
- index.html: el bloque <script type="application/ld+json" id="ld-atlas"> con la
  empresa, el sitio, el producto y el FAQ. Las preguntas se leen del propio FAQ
  de la página, así que al cambiar una basta con volver a correr este script.

Uso: python tools/build_seo.py   (después de tools/build_juegos.py)
"""
import datetime
import html
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://atlas-64.com"  # sin www: www redirige acá
GAMES = json.loads((ROOT / "tools" / "juegos.json").read_text(encoding="utf-8"))

STORE = "https://www.aquihaydragones.com.ar/productos/atlas-64-1rpkv/"
# Precio en pesos para el Product de Google. None = no se publica (Google no
# muestra el precio en los resultados, pero tampoco queda uno viejo si cambia).
PRICE = None

# Ruta pública → archivo. Las que no están acá no van al sitemap (descargar/ es
# una redirección con noindex).
PAGES = {
    "/": "index.html",
    "/juegos/": "juegos.html",
    **{f"/juegos/{g['slug']}/": f"juegos/{g['slug']}/index.html" for g in GAMES},
    "/ecosistema/": "ecosistema.html",
    "/sobre-nosotros/": "sobre-nosotros.html",
    "/user-manual/": "user-manual.html",
    "/privacy-policy/": "privacy-policy.html",
    "/delete-account-guide/": "delete-account-guide.html",
}


def lastmod(file):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", file],
                         cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()  # sin commit todavía: hoy


# ---------------------------------------------------------------- sitemap
urls = "".join(f"  <url>\n    <loc>{SITE}{path}</loc>\n    <lastmod>{lastmod(file)}</lastmod>\n  </url>\n"
               for path, file in PAGES.items())
(ROOT / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n",
    encoding="utf-8", newline="\n")

# ---------------------------------------------------------------- JSON-LD de la portada
index_path = ROOT / "index.html"
index = index_path.read_text(encoding="utf-8")


def text(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", fragment)).split())


faq_html = re.search(r'<div class="faq[^"]*">(.*?)\n          </div>', index, re.S).group(1)
faq = [{"@type": "Question", "name": text(q),
        "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
       for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p[^>]*>(.*?)</p>", faq_html, re.S)]

offer = {"@type": "Offer", "url": STORE, "priceCurrency": "ARS",
         "availability": "https://schema.org/InStock",
         "seller": {"@type": "Organization", "name": "Aquí Hay Dragones"}}
if PRICE:
    offer["price"] = str(PRICE)

ld = {"@context": "https://schema.org", "@graph": [
    {
        "@type": "Organization",
        "@id": SITE + "/#org",
        "name": "WOLO Labs",
        "url": SITE + "/",
        "logo": SITE + "/assets/logo-atlas64-dark.png",
        "email": "admin@wololabs.com",
        "sameAs": ["https://www.instagram.com/atlas64_/", "https://www.youtube.com/@wololabs"],
    },
    {
        "@type": "WebSite",
        "@id": SITE + "/#web",
        "name": "Atlas",
        "url": SITE + "/",
        "inLanguage": "es",
        "publisher": {"@id": SITE + "/#org"},
    },
    {
        "@type": "Product",
        "@id": SITE + "/#atlas",
        "name": "Atlas 64",
        "alternateName": "Atlas",
        "description": re.search(r'name="description"\s+content="([^"]*)"', index).group(1),
        "image": [SITE + "/assets/cta-tablero.jpg", SITE + "/assets/tablero.webp"],
        "category": "Juegos de mesa",
        "brand": {"@type": "Brand", "name": "Atlas"},
        "manufacturer": {"@id": SITE + "/#org"},
        "offers": offer,
    },
    {"@type": "FAQPage", "mainEntity": faq},
]}

block = ('<script type="application/ld+json" id="ld-atlas">\n    '
         + json.dumps(ld, ensure_ascii=False, indent=2).replace("</", "<\\/").replace("\n", "\n    ")
         + "\n    </script>")
if 'id="ld-atlas"' in index:
    index = re.sub(r'<script type="application/ld\+json" id="ld-atlas">.*?</script>', lambda m: block, index, flags=re.S)
else:
    index = index.replace("  </head>", f"    {block}\n  </head>", 1)
index_path.write_text(index, encoding="utf-8", newline="\n")

print(f"listo: sitemap con {len(PAGES)} páginas y {len(faq)} preguntas en el JSON-LD")
