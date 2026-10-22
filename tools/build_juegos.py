"""Genera la sección Juegos a partir de tools/juegos.json.

Escribe el <main> de juegos.html (y su copia juegos/index.html) y una página por
juego en juegos/<slug>/index.html. La barra y el pie se toman de juegos.html, así
que si cambian ahí, al volver a correr este script se copian a las fichas.
Los colores y la tipografía de cada juego están en styles.css (.theme-<slug>).

Uso: python tools/build_juegos.py
"""
import html
import json
import pathlib
import re
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://atlas-64.com"  # sin www: www redirige acá
GAMES = json.loads((ROOT / "tools" / "juegos.json").read_text(encoding="utf-8"))
E = html.escape

catalog = (ROOT / "juegos.html").read_text(encoding="utf-8")
TOPBAR = re.search(r"    <a class=\"visually-hidden\".*?    </header>\n", catalog, re.S).group(0)
FOOTER = re.search(r"    <!-- ================= FOOTER.*?    </footer>\n", catalog, re.S).group(0)
VERSION = re.search(r"styles\.css\?v=([\w-]+)", catalog).group(1)

CHEVRON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def players(g):
    if not g["players_max"]:
        return "Herramienta"
    if g["players_min"] == g["players_max"]:
        n = g["players_min"]
        return f"{n} jugador" + ("es" if n > 1 else "")
    return f'{g["players_min"]} a {g["players_max"]} jugadores'


def groups(g):
    # Filtros: solo, de a dos, en grupo (3 o más)
    out = []
    if g["players_max"]:
        if g["players_min"] <= 1:
            out.append("solo")
        if g["players_min"] <= 2 <= g["players_max"]:
            out.append("dos")
        if g["players_max"] >= 3:
            out.append("grupo")
    return " ".join(out)


def play_label(g):
    return "Cómo se juega" if g["rules"] else "Cómo se usa"


def play_meta(g):
    # Jugadores y duración, dichos en palabras: «1 a 2 jugadores», «10 a 30 minutos»
    if g.get("teaser_meta"):
        return g["teaser_meta"]
    return [players(g), g["duration"].replace("–", " a ").replace(" min", " minutos")]


def fonts_url(games, extra=""):
    # Solo las letras que se usan: los títulos (y en las fichas, sus encabezados).
    fams = "&".join("family=" + g["font"].replace(" ", "+") for g in games)
    text = "".join(sorted(set("".join(g["title"] for g in games) + extra)))
    text = "".join(sorted(set(text + text.upper() + text.lower())))
    return f"https://fonts.googleapis.com/css2?{fams}&display=swap&text={quote(text)}"


def img(src, w=None, h=None, cls="", lazy=None, alt=""):
    # lazy="js": la carga el carrusel cuando hace falta (data-src)
    attr = "data-src" if lazy == "js" else "src"
    size = f' width="{w}" height="{h}"' if w else ""
    load = ' loading="lazy"' if lazy == "native" else ""
    c = f' class="{cls}"' if cls else ""
    return f'<img{c} {attr}="{src}" alt="{E(alt)}"{size}{load} />'


def media(g, lazy=None):
    # Fondo: la portada desenfocada tiñe todo y el arte nítido va a la derecha.
    # En el celular se usa la portada vertical o cuadrada, que entra mejor.
    cover = f'/assets/Games/{g["cover"]}'
    hero = f'/assets/Games/{g["hero"]}'
    s = "data-srcset" if lazy == "js" else "srcset"
    return (f'<div class="g-media" aria-hidden="true">{img(cover, cls="g-blur", lazy=lazy)}'
            f'<picture class="g-art"><source media="(max-width: 760px)" {s}="{cover}" />'
            f'{img(hero, g["hero_w"], g["hero_h"], lazy=lazy)}</picture></div>')


def meta(g, i):
    items = [("Jugadores", players(g)), ("Duración", g["duration"]), ("Dificultad", g["difficulty"])]
    li = "".join(f"<li><span>{k}</span>{E(v)}</li>" for k, v in items)
    return f'<ul class="game-meta rise" style="--i:{i}">{li}</ul>'


def json_ld(data):
    # «</» cortaría el <script> si apareciera en algún texto
    return json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/").replace("\n", "\n    ")


def head(title, desc, path, image, image_w, image_h, fonts, ld):
    return f"""<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{E(title)}</title>
    <meta
      name="description"
      content="{E(desc)}"
    />
    <link rel="canonical" href="{SITE}{path}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{E(title)}" />
    <meta
      property="og:description"
      content="{E(desc)}"
    />
    <meta property="og:image" content="{SITE}{image}" />
    <meta property="og:image:width" content="{image_w}" />
    <meta property="og:image:height" content="{image_h}" />
    <meta property="og:url" content="{SITE}{path}" />
    <meta property="og:site_name" content="Atlas" />
    <meta property="og:locale" content="es_AR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#f9b606" />
    <link rel="icon" href="/favicon.png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700;800;900&display=swap"
      rel="stylesheet"
    />
    <link href="{E(fonts)}" rel="stylesheet" />
    <script>document.documentElement.classList.add("js")</script>
    <script src="/analytics.js?v={VERSION}" async></script>
    <link rel="stylesheet" href="/styles.css?v={VERSION}" />
    <script type="application/ld+json">
    {json_ld(ld)}
    </script>
  </head>
  <body>
"""


def page(head_html, main):
    return (head_html + TOPBAR + '\n    <main id="contenido"' + main + "\n    </main>\n\n" + FOOTER
            + f'\n    <script src="/script.js?v={VERSION}" defer></script>\n  </body>\n</html>\n')


I = "      "

# ---------------------------------------------------------------- catálogo
out = [f'''>
{I}<!-- ================= DESTACADOS =================
{I}     Carrusel: pasa solo (script.js), con flechas, rayitas y deslizando en el celular. -->
{I}<section id="destacados" class="games-hero" data-feat aria-roledescription="carrusel" aria-label="Juegos destacados">
{I}  <h1 class="visually-hidden">Juegos de Atlas</h1>
{I}  <div class="feat__slides">''']
for i, g in enumerate(GAMES):
    first = i == 0
    lazy = None if first else "js"
    if "note" in g:
        out.append(f'{I}    <!-- {g["note"]} -->')
    out.append(f'''{I}    <article class="feat__slide theme-{g["slug"]}{" is-active" if first else ""}" data-feat-slide aria-roledescription="diapositiva" aria-label="{i + 1} de {len(GAMES)}: {E(g["title"])}"{"" if first else " hidden"}>
{I}      {media(g, lazy)}
{I}      <div class="g-content">
{I}        <p class="g-credit rise" style="--i:0">{E(g["credit"])}</p>
{I}        <h2 class="g-title rise" style="--i:1">{E(g["title"])}</h2>
{I}        <p class="g-tagline rise" style="--i:2">{E(g["tagline"])}</p>
{I}        {meta(g, 3)}
{I}        <div class="g-actions rise" style="--i:4">
{I}          <a class="g-btn" href="/juegos/{g["slug"]}/">Ver el juego</a>
{I}          <a class="g-btn g-btn--ghost" href="/juegos/{g["slug"]}/#como-se-juega">{play_label(g)}</a>
{I}        </div>
{I}      </div>
{I}    </article>''')
out.append(f'''{I}  </div>
{I}  <button class="feat__arrow feat__arrow--prev" type="button" data-feat-prev aria-label="Juego anterior">{CHEVRON}</button>
{I}  <button class="feat__arrow feat__arrow--next" type="button" data-feat-next aria-label="Juego siguiente">{CHEVRON}</button>
{I}  <div class="feat__dots" role="group" aria-label="Elegir juego">''')
for i, g in enumerate(GAMES):
    cur = ' aria-current="true"' if i == 0 else ""
    out.append(f'{I}    <button class="feat__dot" type="button" data-feat-dot aria-label="{E(g["title"])}"{cur}></button>')
out.append(f'''{I}  </div>
{I}</section>

{I}<!-- ================= TODOS LOS JUEGOS =================
{I}     La fila se desliza a mano: con el dedo, el trackpad o las flechas (script.js). -->
{I}<section id="biblioteca" class="band band--paper band--fit library" data-enter>
{I}  <div class="wrap-frame">
{I}    <header class="lib-head">
{I}      <h2 class="sec-title display">Todos los juegos</h2>
{I}      <div class="lib-tools enter-body">
{I}        <div class="lib-filters" role="group" aria-label="Filtrar por cantidad de jugadores">
{I}          <button type="button" class="lib-filter" aria-pressed="true" data-filter="todos">Todos</button>
{I}          <button type="button" class="lib-filter" aria-pressed="false" data-filter="solo">Solo</button>
{I}          <button type="button" class="lib-filter" aria-pressed="false" data-filter="dos">De a dos</button>
{I}          <button type="button" class="lib-filter" aria-pressed="false" data-filter="grupo">En grupo</button>
{I}        </div>
{I}        <div class="lib-arrows">
{I}          <button class="lib-arrow" type="button" data-lib-prev aria-label="Ver los anteriores">{CHEVRON}</button>
{I}          <button class="lib-arrow lib-arrow--next" type="button" data-lib-next aria-label="Ver los siguientes">{CHEVRON}</button>
{I}        </div>
{I}      </div>
{I}    </header>
{I}  </div>

{I}  <div class="lib-track" data-lib>
{I}    <ul class="lib-row" data-lib-row>''')
for i, g in enumerate(GAMES):
    cover = f'/assets/Games/{g["cover"]}'
    contain = g.get("cover_fit") == "contain"
    bg = img(cover, cls="lib-card__blur", lazy="native") if contain else ""
    out.append(f'''{I}      <li class="lib-card theme-{g["slug"]}" data-groups="{groups(g)}" style="--i:{i}">
{I}        <a href="/juegos/{g["slug"]}/">
{I}          <span class="lib-card__art{" lib-card__art--contain" if contain else ""}">{bg}{img(cover, g["cover_w"], g["cover_h"], lazy="native", alt="Portada de " + g["title"])}</span>
{I}          <span class="lib-card__label">{E(players(g))} · {E(g["duration"])}</span>
{I}          <span class="lib-card__title">{E(g["title"])}</span>
{I}          <span class="lib-card__tagline">{E(g["tagline"])}</span>
{I}        </a>
{I}      </li>''')
out.append(f'''{I}    </ul>
{I}  </div>
{I}  <p class="lib-empty" data-lib-empty hidden>No hay juegos con ese filtro.</p>
{I}</section>

{I}<!-- ================= ATLAS STUDIO =================
{I}     El key art ya trae el título «Atlas Studio»; el texto y el botón van encima,
{I}     entre el título y el tablero. -->
{I}<section id="atlas-studio" class="studio" data-enter>
{I}  <img class="studio__art" src="/assets/titulos/atlas-studio-keyart.webp" width="1671" height="941" alt="" loading="lazy" />
{I}  <div class="studio__content">
{I}    <h2 class="visually-hidden">Atlas Studio</h2>
{I}    <p class="studio__lede rise" style="--i:1">¡Creá tus propios juegos y publicalos en nuestra tienda!</p>
{I}    <a class="btn btn--solid rise" style="--i:2" href="/ecosistema/#creadores">Quiero saber más</a>
{I}  </div>
{I}</section>''')

# Las tipografías de los juegos van justo después de la de Playfair
catalog = re.sub(r'(family=Playfair[^\n]*\n      rel="stylesheet"\n    />\n)(    <link href="[^"]*" rel="stylesheet" />\n)?',
                 lambda m: m.group(1) + f'    <link href="{E(fonts_url(GAMES))}" rel="stylesheet" />\n', catalog, count=1)
catalog = re.sub(r'(\n    <main id="contenido").*?(\n    </main>)', lambda m: m.group(1) + "\n".join(out) + m.group(2), catalog, flags=re.S)
(ROOT / "juegos.html").write_text(catalog, encoding="utf-8")
(ROOT / "juegos" / "index.html").write_text(catalog, encoding="utf-8")

# ---------------------------------------------------------------- fichas
BUY = "https://www.aquihaydragones.com.ar/productos/atlas-64-1rpkv/"
HEADS = "Reglas Cómo se usa Cómo se juega Cada rol tiene su objetivo"
PLAY = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>'
PHOTO = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4.5 17.5l5-5 3.5 3.5 2.5-2.5 4 4"/></g><circle cx="9" cy="9.8" r="1.7" fill="currentColor"/></svg>'
ICONS = [  # jugadores y reloj, para la línea de jugadores y duración
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 13.7c2.9-.4 5.5 1.5 5.5 4.8"/></g></svg>',
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g></svg>',
]
PHOTO_POS = ["15% 20%", "50% 60%", "85% 85%"]  # cada esqueleto muestra otra parte del arte

for n, g in enumerate(GAMES):
    slug = g["slug"]
    title = E(g["title"])
    prev, nxt = GAMES[n - 1], GAMES[(n + 1) % len(GAMES)]
    desc = "".join(f"<p>{E(p)}</p>" for p in g["description"])
    has_rules = bool(g["rules"])
    label = play_label(g)
    note = f'\n{I}<!-- {g["note"]} -->' if "note" in g else ""

    if has_rules:
        actions = (f'<a class="g-btn" href="#reglas">Ver reglas</a>\n'
                   f'{I}      <a class="g-btn g-btn--ghost" href="#como-se-juega">{label}</a>')
    else:
        actions = (f'<a class="g-btn" href="#como-se-juega">{label}</a>\n'
                   f'{I}      <a class="g-btn g-btn--ghost" href="{BUY}" rel="noopener">Comprar Atlas</a>')

    rules_section = ""
    if has_rules:
        roles = ""
        if g.get("roles"):
            cards = "".join(f'\n{I}        <li class="role-card rise" style="--i:{k + 1}"><strong>{E(r)}</strong>{E(t)}</li>' for k, (r, t) in enumerate(g["roles"]))
            roles = f'\n{I}      <h3 class="rules-sub rise" style="--i:0">Cada rol tiene su objetivo</h3>\n{I}      <ul class="role-list">{cards}\n{I}      </ul>'
        rules = "".join(f'\n{I}        <li class="rule rise" style="--i:{k + 1}">{E(r)}</li>' for k, r in enumerate(g["rules"]))
        size = "s" if len(g["rules"]) <= 4 else "m" if len(g["rules"]) <= 7 else "l"
        rules_section = f'''
{I}<!-- ================= REGLAS ================= -->
{I}<section id="reglas" class="band band--fit game-rules" data-enter>
{I}  <div class="game-rules__bg" aria-hidden="true">{img("/assets/Games/" + g["hero"], lazy="native")}</div>
{I}  <div class="wrap">
{I}    <header class="sec-head">
{I}      <h2 class="sec-title display">Reglas</h2>
{I}    </header>{roles}
{I}    <ul class="rule-list rule-list--{size}">{rules}
{I}    </ul>
{I}  </div>
{I}</section>
'''

    meta_line = "".join(f'<li>{ICONS[k % 2]}{E(t)}</li>' for k, t in enumerate(play_meta(g)))
    cover = "/assets/Games/" + g["cover"]
    photos = "".join(f'\n{I}          <span class="photo-skel rise" style="--i:{k + 3}"><img src="{cover}" alt="" loading="lazy" style="object-position:{pos}" />{PHOTO}</span>' for k, pos in enumerate(PHOTO_POS))

    main = f''' class="game theme-{slug}">{note}
{I}<!-- ================= PORTADA ================= -->
{I}<section id="inicio" class="game-hero" data-enter>
{I}  {media(g)}
{I}  <div class="g-content">
{I}    <a class="game-back rise" style="--i:0" href="/juegos/">{CHEVRON}Todos los juegos</a>
{I}    <p class="g-credit rise" style="--i:1">{E(g["credit"])}</p>
{I}    <h1 class="g-title rise" style="--i:2">{title}</h1>
{I}    {meta(g, 3)}
{I}    <div class="game-desc rise" style="--i:4">{desc}</div>
{I}    <div class="g-actions rise" style="--i:5">
{I}      {actions}
{I}    </div>
{I}  </div>
{I}</section>
{rules_section}
{I}<!-- ================= {label.upper()} =================
{I}     Explicación corta en la tipografía del juego: que den ganas de jugarlo en Atlas. -->
{I}<section id="como-se-juega" class="band band--fit game-play" data-enter>
{I}  <div class="wrap">
{I}    <div class="game-play__grid">
{I}      <div class="game-play__text">
{I}        <h2 class="sec-title display">{label}</h2>
{I}        <ul class="game-play__meta rise" style="--i:1">{meta_line}</ul>
{I}        <p class="game-play__teaser rise" style="--i:2">{E(g["teaser"])}</p>
{I}        <div class="game-play__buy rise" style="--i:3">
{I}          <p>Para {"jugarlo" if has_rules else "usarlo"} necesitás <strong>Atlas</strong>.</p>
{I}          <div class="g-actions">
{I}            <a class="g-btn" href="{BUY}" rel="noopener">Comprar Atlas</a>
{I}            <a class="g-btn g-btn--ghost" href="/">Conocé Atlas</a>
{I}          </div>
{I}        </div>
{I}      </div>
{I}      <!-- PENDIENTE: reemplazar los esqueletos por el video de una partida (un <video> con póster o un
{I}           embed de YouTube en el recuadro 16:9) y por fotos reales del juego sobre el tablero. -->
{I}      <div class="game-play__media">
{I}        <figure class="video-skel rise" style="--i:2" role="img" aria-label="Video de una partida de {title}: próximamente">
{I}          {img(cover, cls="video-skel__bg", lazy="native")}
{I}          <span class="video-skel__play" aria-hidden="true">{PLAY}</span>
{I}          <span class="video-skel__bar" aria-hidden="true"><span></span></span>
{I}          <figcaption class="video-skel__cap">Video de una partida · Próximamente</figcaption>
{I}        </figure>
{I}        <div class="photo-skels" role="img" aria-label="Fotos de {title} sobre el tablero: próximamente">{photos}
{I}        </div>
{I}      </div>
{I}    </div>
{I}  </div>
{I}</section>

{I}<!-- Flechas fijas al juego anterior y al siguiente: siguen a mano en cualquier sección -->
{I}<nav class="game-arrows" aria-label="Otros juegos">
{I}  <a class="game-arrow game-arrow--prev" href="/juegos/{prev["slug"]}/" aria-label="Juego anterior: {E(prev["title"])}">{CHEVRON}<span>{E(prev["title"])}</span></a>
{I}  <a class="game-arrow game-arrow--next" href="/juegos/{nxt["slug"]}/" aria-label="Juego siguiente: {E(nxt["title"])}">{CHEVRON}<span>{E(nxt["title"])}</span></a>
{I}</nav>'''

    extra = HEADS + "".join(r for r, _ in g.get("roles", [])) + g["teaser"] + "".join(play_meta(g))
    url = f"{SITE}/juegos/{slug}/"
    game_ld = {
        "@type": "VideoGame",
        "name": g["title"],
        "url": url,
        "description": " ".join(g["description"]),
        "image": SITE + cover,
        "inLanguage": "es",
        "gamePlatform": "Atlas 64",
    }
    # «credit» es el autor («Creado por …») o, si no, una etiqueta de género
    if g["credit"].startswith("Creado por "):
        game_ld["author"] = {"@type": "Person", "name": g["credit"][len("Creado por "):]}
    else:
        game_ld["genre"] = g["credit"]
    if g["players_max"]:
        game_ld["numberOfPlayers"] = {"@type": "QuantitativeValue", "minValue": g["players_min"], "maxValue": g["players_max"]}
    ld = {"@context": "https://schema.org", "@graph": [game_ld, {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Atlas", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Juegos", "item": SITE + "/juegos/"},
            {"@type": "ListItem", "position": 3, "name": g["title"], "item": url},
        ],
    }]}
    h = head(f'{g["title"]} | Juegos | Atlas', g["tagline"], f"/juegos/{slug}/", cover, g["cover_w"], g["cover_h"],
             fonts_url([g], extra), ld)
    out_dir = ROOT / "juegos" / slug
    out_dir.mkdir(exist_ok=True)
    (out_dir / "index.html").write_text(page(h, main), encoding="utf-8")

print(f"listo: catálogo y {len(GAMES)} fichas")
