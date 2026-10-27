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

# Dónde se consigue Atlas: por ahora sólo en la campaña de Kickstarter, con
# registro previo en el funnel de preventa. Cuando haya tienda propia, cambiar
# STORE, AVAILABILITY (p. ej. "InStock") y el precio.
STORE = "https://presale.atlas-64.com/"
AVAILABILITY = "PreOrder"
SELLER = {"@type": "Organization", "name": "WOLO Labs", "url": "https://wololabs.com/"}
# Precio del Product de Google. Google exige precio (o reseñas) para aceptar un
# Product, así que con PRICE = None el producto no se declara en el JSON-LD (Search
# Console lo marcaría como error crítico). El precio tiene que figurar también en
# el texto visible de la página (está en el FAQ, «¿Dónde puedo conseguir Atlas?»).
PRICE = 250
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
               "availability": "https://schema.org/" + AVAILABILITY, "seller": SELLER},
}

# ---------------------------------------------------------------- reseñas
# Las reseñas están en tools/resenas.json (nombre, lugar, puntaje 1-5, fecha,
# texto). Con ellas se arma la sección visible de la portada, antes del FAQ. Las
# que tienen "ejemplo": true muestran la etiqueta «Reseña de ejemplo» y NO van a
# Google: al JSON-LD (review y aggregateRating) sólo llegan las reales, porque
# Google exige que sean de clientes de verdad y que se vean en la página.
# Interruptor de la sección: con False no se genera ni va a Google (Google exige
# que las reseñas declaradas se vean en la página).
RESENAS_VISIBLES = False
RESENAS = sorted(json.loads((ROOT / "tools" / "resenas.json").read_text(encoding="utf-8")),
                 key=lambda r: r["fecha"], reverse=True)
reales = [r for r in RESENAS if not r.get("ejemplo")]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
E = html.escape


def stars(n, cls="review__stars"):
    return (f'<span class="{cls}" role="img" aria-label="{n} de 5 estrellas">'
            f'<span class="is-on">{"★" * n}</span>{"★" * (5 - n)}</span>')


def review_card(r):
    y, m, _ = r["fecha"].split("-")
    tag = '\n              <span class="review__tag">Reseña de ejemplo</span>' if r.get("ejemplo") else ""
    lugar = f" · {E(r['lugar'])}" if r.get("lugar") else ""
    return f'''            <li class="review">{tag}
              {stars(r["puntaje"])}
              <blockquote class="review__text"><p>{E(r["texto"])}</p></blockquote>
              <p class="review__author"><strong>{E(r["nombre"])}</strong>{lugar}</p>
              <p class="review__meta">Cliente de los tableros de prueba · {MESES[int(m) - 1]} de {y}</p>
            </li>'''


START, END = "      <!-- RESEÑAS:inicio -->\n", "      <!-- RESEÑAS:fin -->\n"
section = ""
if RESENAS and RESENAS_VISIBLES:
    avg = sum(r["puntaje"] for r in RESENAS) / len(RESENAS)
    arrow = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    cards = "\n".join(review_card(r) for r in RESENAS)
    section = f'''      <!-- ================= RESEÑAS =================
           La genera tools/build_seo.py a partir de tools/resenas.json: no editar a mano. -->
      <section class="band band--ink reviews" id="resenas" data-enter data-rail-scope>
        <div class="wrap">
          <header class="sec-head reviews__head">
            <div>
              <h2 class="sec-title display">Lo que dicen quienes ya juegan</h2>
              <p class="reviews__summary">{stars(round(avg), "review__stars review__stars--lg")}
                <strong>{f"{avg:.1f}".replace(".", ",")}</strong> de 5 · {len(RESENAS)} reseñas</p>
            </div>
            <div class="lib-arrows reviews__arrows">
              <button class="lib-arrow" type="button" data-rail-prev aria-label="Reseñas anteriores">{arrow}</button>
              <button class="lib-arrow lib-arrow--next" type="button" data-rail-next aria-label="Más reseñas">{arrow}</button>
            </div>
          </header>
          <ul class="reviews__track" data-rail>
{cards}
          </ul>
        </div>
      </section>

'''
if START not in index:
    anchor = "      <!-- ================= FAQ ================= -->"
    index = index.replace(anchor, START + END + "\n" + anchor, 1)
index = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda m: START + section + END, index, flags=re.S)

if reales and RESENAS_VISIBLES:
    product["aggregateRating"] = {"@type": "AggregateRating", "bestRating": 5, "reviewCount": len(reales),
                                  "ratingValue": round(sum(r["puntaje"] for r in reales) / len(reales), 1)}
    product["review"] = [{"@type": "Review", "author": {"@type": "Person", "name": r["nombre"]},
                          "datePublished": r["fecha"], "reviewBody": r["texto"],
                          "reviewRating": {"@type": "Rating", "ratingValue": r["puntaje"], "bestRating": 5}}
                         for r in reales]

ld = {"@context": "https://schema.org", "@graph": [
    {
        "@type": "Organization",
        "@id": SITE + "/#org",
        "name": "WOLO Labs",
        "url": SELLER["url"],
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

print(f"listo: producto {'con precio' if PRICE else 'sin declarar (falta PRICE)'}, {len(reales)} reseñas reales y {len(RESENAS) - len(reales)} de ejemplo, sitemap con {len(PAGES)} páginas, {len(faq)} preguntas en el JSON-LD y llms.txt con {len(GAMES)} juegos")
