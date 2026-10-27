"""Lo que comparten todas las páginas en los dos idiomas.

- RUTAS: la dirección de cada página en inglés y en español. El inglés es el
  idioma principal: vive en la raíz y es el x-default. El español vive en /es/.
- La barra de navegación (con el selector de idioma) y el pie, en cada idioma.
- El bloque de enlaces hreflang del <head>.
- REDIRECCIONES: las direcciones viejas (antes del sitio bilingüe) y a dónde van.

Lo usan tools/build_idiomas.py, tools/build_juegos.py y tools/build_seo.py.
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://atlas-64.com"  # sin www: www redirige acá
GAMES = json.loads((ROOT / "tools" / "juegos.json").read_text(encoding="utf-8"))
E = html.escape

IDIOMAS = ("en", "es")  # el primero es el principal (raíz y x-default)
LOCALE = {"en": "en_US", "es": "es_AR"}  # og:locale

RUTAS = {
    "inicio": {"en": "/", "es": "/es/"},
    "juegos": {"en": "/games/", "es": "/es/juegos/"},
    **{f"juego:{g['slug']}": {"en": f"/games/{g['slug']}/", "es": f"/es/juegos/{g['slug']}/"} for g in GAMES},
    "ecosistema": {"en": "/ecosystem/", "es": "/es/ecosistema/"},
    "nosotros": {"en": "/about-us/", "es": "/es/sobre-nosotros/"},
    "manual": {"en": "/user-manual/", "es": "/es/manual-de-usuario/"},
    "privacidad": {"en": "/privacy-policy/", "es": "/es/politica-de-privacidad/"},
    "baja": {"en": "/delete-account-guide/", "es": "/es/eliminar-cuenta/"},
}

# Archivo viejo → dirección nueva. Las páginas en español que vivían en la raíz
# pasaron a /es/; las que ya tenían nombre en inglés siguen en su lugar, ahora en
# inglés, y su copia .html redirige a la carpeta.
REDIRECCIONES = {
    "juegos.html": "/es/juegos/",
    "juegos/index.html": "/es/juegos/",
    **{f"juegos/{g['slug']}/index.html": f"/es/juegos/{g['slug']}/" for g in GAMES},
    "ecosistema.html": "/es/ecosistema/",
    "ecosistema/index.html": "/es/ecosistema/",
    "sobre-nosotros.html": "/es/sobre-nosotros/",
    "sobre-nosotros/index.html": "/es/sobre-nosotros/",
    "user-manual.html": "/user-manual/",
    "privacy-policy.html": "/privacy-policy/",
    "delete-account-guide.html": "/delete-account-guide/",
    # La vieja página de descarga del APK: la llevan códigos QR impresos
    "descargar/index.html": "/ecosystem/#app",
}


def archivo(ruta):
    """El index.html que sirve una ruta («/games/» → games/index.html)."""
    return ROOT / ruta.strip("/") / "index.html" if ruta != "/" else ROOT / "index.html"


def paginas():
    """(clave, idioma, archivo) de cada página publicada."""
    return [(k, lang, archivo(r[lang])) for k, r in RUTAS.items() for lang in IDIOMAS]


# ---------------------------------------------------------------- textos

T = {
    "en": {
        "saltar": "Skip to content",
        "inicio": "Atlas — home",
        "menu": "Menu",
        "nav": "Main navigation",
        "producto": "Product",
        "juegos": "Games",
        "ecosistema": "Ecosystem",
        "nosotros": "About us",
        "lema": "The map of worlds",
        "redes": "Social",
        "soporte": "Support",
        "manual": "User manual",
        "contacto": "Contact",
        "app": "Download the app",
        "privacidad": "Privacy policy",
        "baja": "Delete your account",
        "legal": "© Atlas — Developed by WOLO Labs.<br />Made in Argentina.",
        # El selector lleva a la misma página en el otro idioma, escrito en ese idioma
        "otro": ("es", "ES", "Español", "Ver esta página en español"),
    },
    "es": {
        "saltar": "Saltar al contenido",
        "inicio": "Atlas — inicio",
        "menu": "Menú",
        "nav": "Navegación principal",
        "producto": "Producto",
        "juegos": "Juegos",
        "ecosistema": "Ecosistema",
        "nosotros": "Sobre nosotros",
        "lema": "El mapa de mundos",
        "redes": "Redes",
        "soporte": "Soporte",
        "manual": "Manual de usuario",
        "contacto": "Contacto",
        "app": "Descargar la app",
        "privacidad": "Política de privacidad",
        "baja": "Eliminar la cuenta",
        "legal": "© Atlas — Desarrollado por WOLO Labs.<br />Made in Argentina.",
        "otro": ("en", "EN", "English", "View this page in English"),
    },
}


def url(clave, lang):
    return RUTAS[clave][lang]


def barra(clave, lang):
    t = T[lang]
    otro, sigla, nombre, accion = t["otro"]
    # Las fichas de juego marcan «Juegos» en la barra
    actual = "juegos" if clave.startswith("juego:") else clave

    def link(k, texto):
        cur = ' aria-current="page"' if k == actual else ""
        return f'          <a href="{url(k, lang)}"{cur}>{texto}</a>\n'

    return (
        f'    <a class="visually-hidden" href="#contenido">{t["saltar"]}</a>\n\n'
        '    <header class="topbar">\n'
        '      <div class="wrap topbar__inner">\n'
        f'        <a class="brand" href="{url("inicio", lang)}" aria-label="{t["inicio"]}">\n'
        '          <img class="brand-logo" src="/assets/logo-lockup-dark.png" alt="" width="900" height="185" />\n'
        '        </a>\n'
        '        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="nav-principal">\n'
        f'          {t["menu"]}\n'
        '        </button>\n'
        f'        <nav class="topbar__nav" id="nav-principal" data-nav aria-label="{t["nav"]}">\n'
        + link("inicio", t["producto"]) + link("juegos", t["juegos"])
        + link("ecosistema", t["ecosistema"]) + link("nosotros", t["nosotros"]) +
        '        </nav>\n'
        f'        <a class="lang-switch" href="{url(clave, otro)}" hreflang="{otro}" lang="{otro}" title="{nombre}" data-lang-switch>'
        f'<span aria-hidden="true">{sigla}</span><span class="visually-hidden">{accion}</span></a>\n'
        '      </div>\n'
        '    </header>\n'
    )


DECO = (ROOT / "tools" / "pie_deco.html").read_text(encoding="utf-8").rstrip("\n")


def pie(lang):
    t = T[lang]
    return f'''    <footer class="site-footer site-footer--compact">
{DECO}

      <div class="wrap-wide site-footer__inner">
        <span class="site-footer__rule" aria-hidden="true"></span>

        <div class="site-footer__brand">
          <img src="/assets/wordmark-atlas-dark.png" alt="Atlas" width="1200" height="326" loading="lazy" />
          <p class="footer-tagline">{t["lema"]}</p>
        </div>

        <div class="site-footer__links">
          <div class="site-footer__cols">
            <div>
              <h3>{t["redes"]}</h3>
              <ul>
                <li><a href="https://www.instagram.com/atlas64_/" rel="noopener">Instagram</a></li>
                <!-- PENDIENTE: agregar las URLs de Discord, TikTok, X y LinkedIn. -->
                <li>Discord</li>
                <li>TikTok</li>
                <li>X</li>
                <li>LinkedIn</li>
              </ul>
            </div>
            <div>
              <h3>{t["soporte"]}</h3>
              <ul>
                <li><a href="{url("manual", lang)}">{t["manual"]}</a></li>
                <li><a href="{url("inicio", lang)}#faq">FAQ</a></li>
                <li><a href="mailto:admin@wololabs.com">{t["contacto"]}</a></li>
                <li><a href="{url("ecosistema", lang)}#app">{t["app"]}</a></li>
              </ul>
            </div>
          </div>

          <p class="site-footer__legal-links">
            <a href="{url("privacidad", lang)}">{t["privacidad"]}</a>
            <a href="{url("baja", lang)}">{t["baja"]}</a>
          </p>

          <p class="site-footer__legal">
            {t["legal"]}
          </p>
        </div>
      </div>
    </footer>
'''


def idiomas(clave, lang):
    """hreflang de la página en cada idioma (más x-default) y su og:locale."""
    links = "".join(f'    <link rel="alternate" hreflang="{l}" href="{SITE}{url(clave, l)}" />\n' for l in IDIOMAS)
    links += f'    <link rel="alternate" hreflang="x-default" href="{SITE}{url(clave, IDIOMAS[0])}" />\n'
    locales = f'    <meta property="og:locale" content="{LOCALE[lang]}" />\n'
    locales += "".join(f'    <meta property="og:locale:alternate" content="{LOCALE[l]}" />\n' for l in IDIOMAS if l != lang)
    return links + locales


# ---------------------------------------------------------------- aplicar

MARCAS = {
    "idiomas": ("    <!-- idiomas:inicio -->\n", "    <!-- idiomas:fin -->\n"),
    "barra": ("    <!-- barra:inicio -->\n", "    <!-- barra:fin -->\n"),
    "pie": ("    <!-- pie:inicio -->\n", "    <!-- pie:fin -->\n"),
}


def _rellenar(doc, nombre, contenido):
    ini, fin = MARCAS[nombre]
    return re.sub(re.escape(ini) + ".*?" + re.escape(fin), lambda m: ini + contenido + fin, doc, count=1, flags=re.S)


def aplicar(doc, clave, lang):
    """Pone el idioma, los hreflang, la barra y el pie de la página.

    La primera vez reemplaza la barra y el pie escritos a mano por las marcas
    <!-- barra:inicio --> … <!-- pie:fin -->; después sólo rellena las marcas."""
    doc = re.sub(r'<html lang="[^"]*">', f'<html lang="{lang}">', doc, count=1)
    if MARCAS["idiomas"][0] not in doc:
        doc = re.sub(r'    <meta property="og:locale[^>]*>\n', "", doc)
        doc = re.sub(r'(    <link rel="canonical"[^>]*>\n)', lambda m: m.group(1) + "".join(MARCAS["idiomas"]), doc, count=1)
    if MARCAS["barra"][0] not in doc:
        doc = re.sub(r'    <a class="visually-hidden".*?</header>\n', lambda m: "".join(MARCAS["barra"]), doc, count=1, flags=re.S)
    if MARCAS["pie"][0] not in doc:
        doc = re.sub(r'(    <!-- =+ FOOTER =+ -->\n)?    <footer .*?</footer>\n', lambda m: "".join(MARCAS["pie"]), doc, count=1, flags=re.S)
    for nombre in MARCAS:
        if MARCAS[nombre][0] not in doc:
            raise SystemExit(f"falta la marca «{nombre}» (¿la página no tiene canonical, barra o pie?)")
    doc = _rellenar(doc, "idiomas", idiomas(clave, lang))
    doc = _rellenar(doc, "barra", barra(clave, lang))
    return _rellenar(doc, "pie", pie(lang))


def redireccion(destino):
    """Página que lleva a otra dirección. GitHub Pages no permite redirecciones
    301: un meta refresh inmediato con canonical es lo que Google trata como
    una redirección permanente."""
    d = E(destino)
    ruta, _, ancla = destino.partition("#")
    ancla = "#" + ancla if ancla else ""
    lang = next((l for l in IDIOMAS[1:] if destino.startswith(f"/{l}/")), IDIOMAS[0])
    return f'''<!DOCTYPE html>
<html lang="{lang}">
  <head>
    <meta charset="UTF-8" />
    <!-- Dirección vieja: la genera tools/build_idiomas.py (REDIRECCIONES en tools/sitio.py). -->
    <title>Atlas 64</title>
    <link rel="canonical" href="{SITE}{d}" />
    <meta http-equiv="refresh" content="0; url={d}" />
    <script>location.replace("{ruta}" + location.search + (location.hash || "{ancla}"))</script>
  </head>
  <body>
    <p><a href="{d}">Atlas 64</a></p>
  </body>
</html>
'''
