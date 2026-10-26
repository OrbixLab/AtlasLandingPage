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
# Precio del Product de Google. Google exige precio (o reseñas) para aceptar un
# Product, así que mientras PRICE sea None el producto no se declara en el JSON-LD
# (Search Console lo marcaría como error crítico). Cuando el precio esté definido,
# completarlo, por ejemplo PRICE = 250 y CURRENCY = "USD", y volver a correr.
PRICE = None
CURRENCY = "USD"

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

product = {
    "@type": "Product",
    "@id": SITE + "/#atlas",
    "name": "Atlas 64",
    "alternateName": "Atlas",
    "description": re.search(r'name="description"\s+content="([^"]*)"', index).group(1),
    "image": [SITE + "/assets/cta-tablero.jpg", SITE + "/assets/tablero.webp"],
    "category": "Juegos de mesa",
    "audience": {"@type": "PeopleAudience", "suggestedMinAge": 14},
    "brand": {"@id": SITE + "/#marca"},
    "url": SITE + "/",
    "manufacturer": {"@id": SITE + "/#org"},
    "offers": {"@type": "Offer", "url": STORE, "price": str(PRICE), "priceCurrency": CURRENCY,
               "availability": "https://schema.org/InStock",
               "seller": {"@type": "Organization", "name": "Aquí Hay Dragones"}},
}

ld = {"@context": "https://schema.org", "@graph": [
    {
        "@type": "Organization",
        "@id": SITE + "/#org",
        "name": "WOLO Labs",
        "url": SITE + "/",
        "logo": SITE + "/assets/logo-atlas64-dark.png",
        "email": "admin@wololabs.com",
        "sameAs": ["https://www.instagram.com/atlas64_/", "https://www.youtube.com/@wololabs"],
        # La marca y su sitio oficial: para que los buscadores asocien «Atlas 64»
        # con este dominio y no con las tiendas que lo venden
        "brand": {"@type": "Brand", "@id": SITE + "/#marca", "name": "Atlas 64", "alternateName": "Atlas",
                  "url": SITE + "/", "logo": SITE + "/assets/logo-atlas64-dark.png"},
    },
    {
        "@type": "WebSite",
        "@id": SITE + "/#web",
        "name": "Atlas 64",
        "alternateName": "Atlas",
        "url": SITE + "/",
        "inLanguage": "es",
        "publisher": {"@id": SITE + "/#org"},
    },
    *([product] if PRICE else []),
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

# ---------------------------------------------------------------- llms.txt
# Resumen para asistentes de IA. El texto fijo está en tools/llms_base.md; los
# juegos salen de juegos.json. llms.txt lleva una línea por juego y
# llms-full.txt, además, la descripción y las reglas completas.

def players(g):
    if not g["players_max"]:
        return "herramienta, sin cantidad fija de jugadores"
    if g["players_min"] == g["players_max"]:
        n = g["players_min"]
        return f"{n} jugador" + ("es" if n > 1 else "")
    return f'{g["players_min"]} a {g["players_max"]} jugadores'


def game_line(g):
    url = f"{SITE}/juegos/{g['slug']}/"
    return (f"- [{g['title']}]({url}) — {g['credit']}. {players(g)}, {g['duration'].lower()}, "
            f"dificultad {g['difficulty'].lower()}. {g['tagline']}")


def game_full(g):
    out = [f"### {g['title']}", "",
           f"{g['credit']} · {players(g)} · {g['duration']} · dificultad {g['difficulty'].lower()} · "
           f"{SITE}/juegos/{g['slug']}/", "", " ".join(g["description"]), ""]
    if g["features"]:
        out += ["Características:", *[f"- {f}" for f in g["features"]], ""]
    if g.get("roles"):
        out += ["Roles:", *[f"- **{r}**: {t}" for r, t in g["roles"]], ""]
    if g["rules"]:
        out += ["Cómo se juega:", *[f"{k}. {r}" for k, r in enumerate(g["rules"], 1)], ""]
    return "\n".join(out).rstrip()


base = (ROOT / "tools" / "llms_base.md").read_text(encoding="utf-8")
short = (base.replace("{{JUEGOS}}", "\n".join(game_line(g) for g in GAMES)
                      + f"\n\nReglas completas de cada juego: {SITE}/llms-full.txt")
         .replace("{{OTRA_VERSION}}", f"- [Versión completa, con las reglas de cada juego]({SITE}/llms-full.txt)\n"))
full = (base.replace("{{JUEGOS}}", "\n\n".join(game_full(g) for g in GAMES).rstrip())
        .replace("{{OTRA_VERSION}}", ""))
(ROOT / "llms.txt").write_text(short, encoding="utf-8", newline="\n")
(ROOT / "llms-full.txt").write_text(full, encoding="utf-8", newline="\n")

print(f"listo: producto {'con precio' if PRICE else 'sin declarar (falta PRICE)'}, sitemap con {len(PAGES)} páginas, {len(faq)} preguntas en el JSON-LD y llms.txt con {len(GAMES)} juegos")
