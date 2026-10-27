"""Genera sitemap.xml, los datos estructurados (JSON-LD) de la portada y llms.txt.

- sitemap.xml: todas las páginas públicas, en inglés y en español, con su URL
  canónica (con barra final), la fecha del último commit que las tocó y sus
  versiones en el otro idioma (hreflang), como pide Google para sitios bilingües.
- index.html y es/index.html: el bloque <script type="application/ld+json"
  id="ld-atlas"> con la empresa, el sitio, el producto y el FAQ. Las preguntas se
  leen del propio FAQ de cada portada, así que al cambiar una basta con volver a
  correr este script.
- llms.txt y llms-full.txt (inglés) y es/llms.txt y es/llms-full.txt (español).

Uso: python tools/build_seo.py   (después de tools/build_juegos.py y tools/build_idiomas.py)
"""
import datetime
import html
import json
import re
import subprocess

import sitio
from sitio import GAMES, IDIOMAS, ROOT, SITE, url

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

T = {
    "es": {
        "categoria": "Juegos de mesa",
        "estrellas": "{} de 5 estrellas",
        "ejemplo": "Reseña de ejemplo",
        "cliente": "Cliente de los tableros de prueba · {mes} de {anio}",
        "meses": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
                  "septiembre", "octubre", "noviembre", "diciembre"],
        "titulo": "Lo que dicen quienes ya juegan",
        "resumen": "de 5 · {} reseñas",
        "anteriores": "Reseñas anteriores", "mas": "Más reseñas",
        "decimal": ",",
    },
    "en": {
        "categoria": "Board games",
        "estrellas": "{} out of 5 stars",
        "ejemplo": "Sample review",
        "cliente": "Prototype board customer · {mes} {anio}",
        "meses": ["January", "February", "March", "April", "May", "June", "July", "August",
                  "September", "October", "November", "December"],
        "titulo": "What players are saying",
        "resumen": "out of 5 · {} reviews",
        "anteriores": "Previous reviews", "mas": "More reviews",
        "decimal": ".",
    },
}


def lastmod(file):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", file],
                         cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()  # sin commit todavía: hoy


# ---------------------------------------------------------------- sitemap
# Cada URL lleva sus versiones en los dos idiomas y la x-default (la inglesa).
urls = ""
for clave, rutas in sitio.RUTAS.items():
    alternos = "".join(f'    <xhtml:link rel="alternate" hreflang="{l}" href="{SITE}{rutas[l]}" />\n' for l in IDIOMAS)
    alternos += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{rutas[IDIOMAS[0]]}" />\n'
    for lang in IDIOMAS:
        file = sitio.archivo(rutas[lang]).relative_to(ROOT).as_posix()
        urls += f"  <url>\n    <loc>{SITE}{rutas[lang]}</loc>\n    <lastmod>{lastmod(file)}</lastmod>\n{alternos}  </url>\n"
(ROOT / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + urls + "</urlset>\n",
    encoding="utf-8", newline="\n")


# ---------------------------------------------------------------- reseñas
# Las reseñas están en tools/resenas.json (nombre, lugar, puntaje 1-5, fecha,
# texto). Con ellas se arma la sección visible de cada portada, antes del FAQ. Las
# que tienen "ejemplo": true muestran la etiqueta «Reseña de ejemplo» y NO van a
# Google: al JSON-LD (review y aggregateRating) sólo llegan las reales, porque
# Google exige que sean de clientes de verdad y que se vean en la página.
# Interruptor de la sección: con False no se genera ni va a Google (Google exige
# que las reseñas declaradas se vean en la página). Los textos de las reseñas
# van como se escribieron (en español) también en la portada inglesa.
RESENAS_VISIBLES = False
RESENAS = sorted(json.loads((ROOT / "tools" / "resenas.json").read_text(encoding="utf-8")),
                 key=lambda r: r["fecha"], reverse=True)
reales = [r for r in RESENAS if not r.get("ejemplo")]
E = html.escape


def stars(n, t, cls="review__stars"):
    return (f'<span class="{cls}" role="img" aria-label="{t["estrellas"].format(n)}">'
            f'<span class="is-on">{"★" * n}</span>{"★" * (5 - n)}</span>')


def review_card(r, lang):
    t = T[lang]
    y, m, _ = r["fecha"].split("-")
    tag = f'\n              <span class="review__tag">{t["ejemplo"]}</span>' if r.get("ejemplo") else ""
    lugar = f" · {E(r['lugar'])}" if r.get("lugar") else ""
    otro = ' lang="es"' if lang != "es" else ""
    return f'''            <li class="review">{tag}
              {stars(r["puntaje"], t)}
              <blockquote class="review__text"{otro}><p>{E(r["texto"])}</p></blockquote>
              <p class="review__author"><strong>{E(r["nombre"])}</strong>{lugar}</p>
              <p class="review__meta">{t["cliente"].format(mes=t["meses"][int(m) - 1], anio=y)}</p>
            </li>'''


def reviews_section(lang):
    if not (RESENAS and RESENAS_VISIBLES):
        return ""
    t = T[lang]
    avg = sum(r["puntaje"] for r in RESENAS) / len(RESENAS)
    arrow = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    cards = "\n".join(review_card(r, lang) for r in RESENAS)
    return f'''      <!-- ================= RESEÑAS =================
           La genera tools/build_seo.py a partir de tools/resenas.json: no editar a mano. -->
      <section class="band band--ink reviews" id="resenas" data-enter data-rail-scope>
        <div class="wrap">
          <header class="sec-head reviews__head">
            <div>
              <h2 class="sec-title display">{t["titulo"]}</h2>
              <p class="reviews__summary">{stars(round(avg), t, "review__stars review__stars--lg")}
                <strong>{f"{avg:.1f}".replace(".", t["decimal"])}</strong> {t["resumen"].format(len(RESENAS))}</p>
            </div>
            <div class="lib-arrows reviews__arrows">
              <button class="lib-arrow" type="button" data-rail-prev aria-label="{t["anteriores"]}">{arrow}</button>
              <button class="lib-arrow lib-arrow--next" type="button" data-rail-next aria-label="{t["mas"]}">{arrow}</button>
            </div>
          </header>
          <ul class="reviews__track" data-rail>
{cards}
          </ul>
        </div>
      </section>

'''


# ---------------------------------------------------------------- JSON-LD de cada portada

def text(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", fragment)).split())


START, END = "      <!-- RESEÑAS:inicio -->\n", "      <!-- RESEÑAS:fin -->\n"
n_faq = {}
for lang in IDIOMAS:
    home = url("inicio", lang)
    index_path = sitio.archivo(home)
    index = index_path.read_text(encoding="utf-8")

    faq_html = re.search(r'<div class="faq[^"]*">(.*?)\n          </div>', index, re.S).group(1)
    faq = [{"@type": "Question", "name": text(q),
            "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
           for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p[^>]*>(.*?)</p>", faq_html, re.S)]
    n_faq[lang] = len(faq)

    product = {
        "@type": "Product",
        "@id": SITE + home + "#atlas",
        "name": "Atlas 64",
        "alternateName": "Atlas",
        "description": html.unescape(re.search(r'name="description"\s+content="([^"]*)"', index).group(1)),
        "image": [SITE + "/assets/cta-tablero.jpg", SITE + "/assets/tablero.webp"],
        "category": T[lang]["categoria"],
        "audience": {"@type": "PeopleAudience", "suggestedMinAge": 14},
        "brand": {"@id": SITE + "/#marca"},
        "url": SITE + home,
        "manufacturer": {"@id": SITE + "/#org"},
        "offers": {"@type": "Offer", "url": STORE, "price": str(PRICE), "priceCurrency": CURRENCY,
                   "availability": "https://schema.org/" + AVAILABILITY, "seller": SELLER},
    }

    if START not in index:
        anchor = "      <!-- ================= FAQ ================= -->"
        index = index.replace(anchor, START + END + "\n" + anchor, 1)
    index = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda m: START + reviews_section(lang) + END, index, flags=re.S)

    if reales and RESENAS_VISIBLES:
        product["aggregateRating"] = {"@type": "AggregateRating", "bestRating": 5, "reviewCount": len(reales),
                                      "ratingValue": round(sum(r["puntaje"] for r in reales) / len(reales), 1)}
        product["review"] = [{"@type": "Review", "author": {"@type": "Person", "name": r["nombre"]},
                              "datePublished": r["fecha"], "reviewBody": r["texto"], "inLanguage": "es",
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
            # Un solo sitio, en dos idiomas
            "@type": "WebSite",
            "@id": SITE + "/#web",
            "name": "Atlas 64",
            "alternateName": "Atlas",
            "url": SITE + "/",
            "inLanguage": list(IDIOMAS),
            "publisher": {"@id": SITE + "/#org"},
        },
        *([product] if PRICE else []),
        {"@type": "FAQPage", "inLanguage": lang, "mainEntity": faq},
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
# Resumen para asistentes de IA. El texto fijo está en tools/llms_base.md (inglés)
# y tools/llms_base.es.md (español); los juegos salen de juegos.json. llms.txt
# lleva una línea por juego y llms-full.txt, además, la descripción y las reglas.

L = {
    "es": {"herramienta": "herramienta, sin cantidad fija de jugadores", "jugador": "jugador", "jugadores": "jugadores",
           "a": "a", "dificultad": "dificultad", "caracteristicas": "Características:", "roles": "Roles:",
           "reglas": "Cómo se juega:", "completas": "Reglas completas de cada juego: {}",
           "version": "- [Versión completa, con las reglas de cada juego]({})\n"},
    "en": {"herramienta": "tool, no fixed number of players", "jugador": "player", "jugadores": "players",
           "a": "to", "dificultad": "difficulty", "caracteristicas": "Features:", "roles": "Roles:",
           "reglas": "How to play:", "completas": "Full rules for every game: {}",
           "version": "- [Full version, with the rules of every game]({})\n"},
}


def players(g, l):
    if not g["players_max"]:
        return l["herramienta"]
    if g["players_min"] == g["players_max"]:
        n = g["players_min"]
        return f"{n} " + (l["jugadores"] if n > 1 else l["jugador"])
    return f'{g["players_min"]} {l["a"]} {g["players_max"]} {l["jugadores"]}'


def game_line(g, lang):
    l = L[lang]
    link = SITE + url("juego:" + g["slug"], lang)
    return (f"- [{g['title']}]({link}) — {g['credit']}. {players(g, l)}, {g['duration'].lower()}, "
            f"{l['dificultad']} {g['difficulty'].lower()}. {g['tagline']}")


def game_full(g, lang):
    l = L[lang]
    out = [f"### {g['title']}", "",
           f"{g['credit']} · {players(g, l)} · {g['duration']} · {l['dificultad']} {g['difficulty'].lower()} · "
           f"{SITE}{url('juego:' + g['slug'], lang)}", "", " ".join(g["description"]), ""]
    if g["features"]:
        out += [l["caracteristicas"], *[f"- {f}" for f in g["features"]], ""]
    if g.get("roles"):
        out += [l["roles"], *[f"- **{r}**: {t}" for r, t in g["roles"]], ""]
    if g["rules"]:
        out += [l["reglas"], *[f"{k}. {r}" for k, r in enumerate(g["rules"], 1)], ""]
    return "\n".join(out).rstrip()


for lang in IDIOMAS:
    games = [{**g, **g.get(lang, {})} if lang != "es" else g for g in GAMES]
    carpeta = "" if lang == IDIOMAS[0] else lang + "/"
    full_url = f"{SITE}/{carpeta}llms-full.txt"
    base = (ROOT / "tools" / ("llms_base.md" if lang == IDIOMAS[0] else f"llms_base.{lang}.md")).read_text(encoding="utf-8")
    short = (base.replace("{{JUEGOS}}", "\n".join(game_line(g, lang) for g in games)
                          + "\n\n" + L[lang]["completas"].format(full_url))
             .replace("{{OTRA_VERSION}}", L[lang]["version"].format(full_url)))
    full = (base.replace("{{JUEGOS}}", "\n\n".join(game_full(g, lang) for g in games).rstrip())
            .replace("{{OTRA_VERSION}}", ""))
    (ROOT / carpeta / "llms.txt").write_text(short, encoding="utf-8", newline="\n")
    (ROOT / carpeta / "llms-full.txt").write_text(full, encoding="utf-8", newline="\n")

print(f"listo: producto {'con precio' if PRICE else 'sin declarar (falta PRICE)'}, {len(reales)} reseñas reales y "
      f"{len(RESENAS) - len(reales)} de ejemplo, sitemap con {len(sitio.RUTAS) * len(IDIOMAS)} páginas, "
      f"preguntas en el JSON-LD {n_faq} y llms.txt con {len(GAMES)} juegos en cada idioma")
