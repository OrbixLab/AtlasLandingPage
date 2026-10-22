# Atlas — sitio web

Sitio estático de Atlas (atlas-64.com), publicado con GitHub Pages. Sin build ni
dependencias: HTML, un CSS y un JS.

## Estructura

| Archivo | Página | Origen |
| --- | --- | --- |
| `index.html` | Producto | página 1 del diseño `ATL_Webfinal.pdf` |
| `juegos.html` | Juegos | catálogo y una página por juego (`juegos/<slug>/`), generados con `python tools/build_juegos.py` desde `tools/juegos.json` (textos tomados de los `metadata.json` de la app) |
| `ecosistema.html` | Ecosistema | página 2 del diseño |
| `sobre-nosotros.html` | Sobre nosotros | página 3 del diseño |
| `user-manual.html` | Manual de usuario y avisos de seguridad | contenido propio |
| `privacy-policy.html` | Política de privacidad | contenido propio |
| `delete-account-guide.html` | Guía para eliminar la cuenta | contenido propio |

Cada página tiene además una copia idéntica en su carpeta (`ecosistema/index.html`,
etc.) para que la URL funcione sin `.html`. **Al editar una página hay que copiarla
a su carpeta**:

```sh
for p in juegos ecosistema sobre-nosotros user-manual privacy-policy delete-account-guide; do
  cp "$p.html" "$p/index.html"
done
```

- Las páginas cargan `styles.css`, `script.js` y `atlas3d.js` con `?v=…`. **Al cambiar
  alguno de esos archivos hay que subir ese número en todas las páginas**; si no, el
  navegador puede seguir usando la versión vieja guardada.
- `styles.css` — sistema de diseño completo (tokens, bandas, componentes y las
  páginas de documentación).
- `script.js` — menú móvil y animación de entrada al hacer scroll.
- `assets/` — fotos de producto, marca y favicons.
- `assets/descargas/` — archivos que se bajan desde el sitio. `AtlasPiecesBase.stl` es la
  rosca para diseñar fichas propias (23 × 23 × 11 mm); la baja el botón «Descargar modelo»
  de «Tus fichas, nuestra base». Si se actualiza, conviene mantener el nombre y corregir
  el peso que muestra el botón.

## Sistema de diseño

- **Color**: amarillo `#F9B606`, tinta `#1D1D1D`, papel `#F1F1F1` / `#E4E4E4`,
  rojo `#CD3F21`.
- **Tipografía**: el cuerpo usa **Helvetica Neue LT Std** (35 Thin / 55 Roman /
  75 Bold), entregada por el estudio y servida desde `assets/fonts/` en `woff2`.
  Los titulares grandes son los SVG vectorizados de `assets/titulos/`, así que
  llevan la Brillante original. Playfair Display (Google Fonts) queda sólo para
  antetítulos, botones y números de paso. Detalle en
  [`assets/fonts/README.md`](assets/fonts/README.md).
- **Marca**: `assets/icon-atlas-*.png` (isotipo), `assets/wordmark-atlas-*.png`
  (logotipo ATLAS), `assets/logo-lockup-*.png` (isotipo + logotipo, el de la barra
  de navegación) y `assets/logo-atlas64-*.png` (lockup completo con «64 · el mapa
  de mundos»), en versión oscura, clara y amarilla.

## Origen de los assets

Todo sale de `D:\Repos\Design resources\AtlasLanding. Web`, la entrega final
del estudio:

| Carpeta de origen | Destino | Qué es |
| --- | --- | --- |
| `Links/Imagenes/2x/` | `assets/*.jpg`, `assets/*.webp` | Fotos de producto y de ambiente, a 2x |
| `Links/titulos/SVG/` | `assets/titulos/` | Los titulares display vectorizados desde Brillante |
| `Links/graficos/SVG/` | `assets/graficos/` | Iconos de tecnología y de equipo |
| `Fonts/` | `assets/fonts/` | Helvetica Neue LT Std, convertida a `woff2` |
| `ATL_WebProgramadorcurvas.pdf` | — | El diseño final; `…copia.pdf` es la versión con texto vivo, útil para medir |

Las fotos de Sobre nosotros llegaron aparte, en la ronda de correcciones
(`ATL_Correcciones.pdf`), como JPG de 6000 px. El sitio sirve versiones
reducidas a 1400–1920 px; los originales no se publican:

| Original | En el sitio | Sección |
| --- | --- | --- |
| `LasMejoresHIstoriasBG.jpg` | `hero-nosotros-mesa.jpg` | Hero |
| `modernizarLaforma_foto2.jpg` | `mision-caja.jpg` | Nuestra misión (blanco y negro) |
| `modernizarLaforma_foto1.jpg` | `mision-mesa.jpg` | Nuestra misión (color) |
| `DiseñamosExperienciasFoto.jpg` | `filosofia-equipo.jpg` | Nuestra filosofía |

`modernizarLaforma_foto1.jpg` es vertical y el diseño la pide apaisada
(1,615:1), así que `mision-mesa.jpg` es un recorte centrado en las caras. Si
aparece una versión horizontal con los tableros, conviene reemplazarla.

El favicon (`favicon.png`, `assets/apple-touch-icon.png`, `assets/favicon-512.png`)
es la «A» del logotipo en negro sobre el amarillo, recortada de
`assets/wordmark-atlas-dark.png`.

Las cuatro tarjetas de «Cómo funciona» (`assets/paso-*.webp`) llegan compuestas
del estudio, con la foto y el texto en una sola pieza. Se usan tal cual y el
texto va en el `alt`: no es posible separarlo sin rehacer las piezas.

## Pendientes marcados en el código

Buscar `PENDIENTE` en los `.html`:

1. **Video en Ecosistema**: el diseño marca «(video)» también en el hero de
   Ecosistema y en la sección de la app. Ambos usan foto por ahora.
2. **Redes**: sólo Instagram tiene enlace. Discord, TikTok, X y LinkedIn están en
   el pie como texto plano, sin enlazar, porque no tenemos sus URLs.
3. Las respuestas del FAQ están redactadas a partir del manual y de la lista de
   juegos nativos de la marca: conviene revisarlas antes de publicar.

`user-manual.html` tiene además su propia lista de datos pendientes en un comentario
al inicio del archivo.

## Estructura del hero

Medido sobre el diseño, la primera pantalla es una caja de 1920×1080 con el medio
al fondo y **el contenido encima**: titular al 18,4 % de la altura, párrafo y
botones apoyados abajo (terminan al 93,4 %) y márgenes laterales del 6 %. Eso es
`.hero--overlay` en `styles.css`, y lo usan las tres páginas. La barra de
navegación flota dentro de esa pantalla (`position: fixed`, con los márgenes del
diseño), por eso las páginas de documentación reservan hueco para ella.

El control de pausa vive en la fila intermedia de la retícula —vacía en el
diseño—, así que no puede solaparse con el titular, el párrafo ni los botones sea
cual sea el tamaño de pantalla.

El velo (`.hero__scrim`) no es decorativo. En el diseño final el titular del hero
es `#e4e4e4`, es decir, texto claro sobre el medio, así que el velo es oscuro y
está calculado sobre los fotogramas reales para que el texto mantenga 4,5:1 aun
en el plano más luminoso del bucle. El hero de Sobre nosotros usa
`.hero__scrim--soft`, un velo parejo y más liviano: su foto ya es oscura, y los
titulares claros caen sobre la remera negra y el buzo claro.

## Retícula del diseño

El diseño se compone sobre un cuadro de 1920 px con márgenes laterales del 6 %,
más ancho que `.wrap` (1400 px). Las secciones rehechas en la ronda de
correcciones usan `.wrap-frame`, que reproduce ese margen: Nuestra historia,
Nuestra misión, Principios, Filosofía y La app.

## Video del hero

`index.html` abre con `assets/hero-atlas.*`, recomprimido desde el original de
54 MB (1920×1080, 21,8 Mb/s) a **1,8 MB en MP4 y 1,2 MB en WebM**: recorte central
a 16:7,5 —la proporción del panel del diseño—, escala a 1600×750, sin pista de
audio. Cada visita descarga sólo uno de los dos (WebM en casi todos los
navegadores), así que son unos 1,2 MB por visita.

Para regenerarlo desde un original nuevo:

```sh
ffmpeg -i ORIGINAL.mp4 -vf "crop=1920:900:0:90,scale=1600:750:flags=lanczos" -an   -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 -preset slow -g 50   -movflags +faststart assets/hero-atlas.mp4
ffmpeg -i ORIGINAL.mp4 -vf "crop=1920:900:0:90,scale=1600:750:flags=lanczos" -an   -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -g 50   assets/hero-atlas.webm
ffmpeg -ss 0 -i ORIGINAL.mp4 -vf "crop=1920:900:0:90,scale=1600:750" -frames:v 1   assets/hero-atlas-poster.jpg
```

El video se reproduce en bucle y sin sonido. El botón de la esquina lo pausa
(WCAG 2.2.2: todo movimiento automático de más de 5 s necesita una forma de
detenerlo) y, si el sistema pide reducir movimiento, arranca pausado mostrando
el póster.

## AtlasHub

La app se descarga desde Google Play y, en iPhone, desde la beta de TestFlight. Los
enlaces están en la sección «La app» de Ecosistema (`/ecosistema/#app`); el pie de
todas las páginas lleva ahí. `descargar/index.html` ya no es una página: redirige a esa
sección para que no se rompan enlaces ni códigos QR viejos.

## Escenas 3D del tablero

`atlas3d.js` arma con Three.js (r128, desde jsDelivr) cuatro escenas en `index.html`.
Cada una es un bloque con `data-atlas3d`:

| Valor | Sección | Qué muestra |
| --- | --- | --- |
| `juegos` | ¿Qué es Atlas? | Tres juegos en ciclo: el Maze, con el laberinto escondido y un tesoro dorado en el centro (la ficha roja choca una pared y vuelve al inicio; la azul llega al tesoro), con las reglas en el epígrafe; una partida de ajedrez (1. e4 e5 2. Cf3) donde al levantar una pieza se encienden sus casillas posibles; y una arena de casillas grises con el rey en llamas en el centro y tres fichas rojas que lo atacan |
| `mesa` | Módulos | De 1 a 6 módulos (botones + y −, arranca en 4) que arman un mapa de rol de ejemplo |
| `modulo` | Atlas Core | Atlas Core espera separado, se acerca y se conecta al borde del módulo una sola vez (se enciende la fila del borde). La conexión arranca cuando se ve al menos el 60 % de la escena, y se repite si la escena sale de pantalla y vuelve. Después se repite: una ficha se apoya, la lámina blanca de Atlas Core se pone rosa al leerla, el tablero dice su nombre en una burbuja ("Red Piece!", `FICHA_NAMES`) y una ola de luz lo recorre. Cada vuelta lee una ficha de otro color |
| `ficha` | Fichas | La ficha se enrosca en la base, se desenrosca, sale y entra otra de otro color |

- Todos los modelos están en `assets/Models3D/`.
- El modelo es `assets/Models3D/atlas64_modulo.glb`, exportado de Fusion 360 (1,4 MB, en
  metros, Y arriba). Cada casilla es un nodo `celda_x_y` con su propio material: x es
  la columna y y la fila desde el borde opuesto al botón y al USB-C.
- Los colores del pogo pin, los contactos y el botón se cambian en el código
  (`RECOLOR`), no en el `.glb`. Las casillas apagadas son `#a9cbf9` y las encendidas,
  rosa `#ff4fa3`.
- La ficha es `assets/Models3D/ficha_roja.glb` (comprimida con meshopt, por eso se carga
  también `meshopt_decoder.js`) y la base, `assets/Models3D/base_con_rosca.glb`. Si la ficha
  no carga, el Maze usa una figura genérica hecha en código (`makePiece`). Los otros
  colores de ficha (`FICHA_COLORS`) se pintan en el código sobre el mismo modelo.
- Las piezas de ajedrez son `assets/Models3D/ajedrez.glb`: un nodo por pieza (`Peon`,
  `Torre`, `Caballero`, `Alfil`, `Reina`, `Rey`), comprimido con meshopt. Salen de los STL
  de `WoloLabs/ChessSet` (en mm, Z arriba) con `tools/convert_chess.py`, que los pasa a
  metros con Y arriba y los reduce a 3.000–7.000 caras; después
  `gltf-transform meshopt ajedrez_raw.glb ajedrez.glb`. El color de cada bando se pone
  en el código. El caballo del modelo mira hacia −x.
- Atlas Core es `assets/Models3D/modulo_nfc.glb`, con el mismo origen que el módulo:
  cargado en 0,0,0 queda acoplado al borde del USB-C.
- Three.js y los modelos se descargan apenas termina de cargar la página. Mientras
  tanto cada bloque muestra un loader de su mismo tamaño con el porcentaje descargado
  (`NEEDS` dice qué modelos espera cada escena), y la escena aparece recién cuando
  tiene todo. Sin WebGL queda la imagen de respaldo que trae cada bloque.
- Las secciones con `band--fit` ocupan una pantalla y su contenido entra entero debajo
  de la barra (probado en 1366 × 768, 1440 × 900 y 390 × 844). En el celular, Cómo
  funciona y la caja pasan a ser carruseles horizontales. Los que llevan `data-autoplay`
  (la caja) avanzan solos cada 2,5 s mientras están a la vista y se frenan al tocarlos.
- Las secciones con `data-enter` tienen el título arriba (`.sec-head`) y una entrada
  animada: el título se enciende en 8 columnas, como las casillas del tablero, y
  después aparece el resto (`.enter-body`). `script.js` agrega `.is-in` al llegar a la
  sección. Sin JavaScript o con movimiento reducido, todo está visible desde el inicio.
- Todas usan una vista isométrica fija, sin giro, y corren a `SPEED` (1,5) veces la
  velocidad de su guion. `view.zoom` acerca la cámara en cada escena y
  `view.mobileZoom` la acerca más en el celular, donde las escenas van de borde a borde.

## Ver el sitio en local

```sh
python -m http.server 8080
# http://127.0.0.1:8080/
```

## SEO y medición

- **Dominio**: el sitio vive en `https://atlas-64.com`, **sin `www`** (`www` redirige
  ahí con un 301). Todos los `canonical`, `og:url` y `og:image` usan esa forma; si
  apuntaran a `www`, Google recibiría una dirección que redirige y dudaría de cuál
  vale.
- **`robots.txt`**: todo es público, y nombra a los bots de buscadores y de IA
  (Google, Bing, OpenAI, Anthropic, Perplexity, Apple) para que quede explícito.
- **`sitemap.xml`** y el **JSON-LD de la portada** (empresa, producto y FAQ) los
  genera `python tools/build_seo.py`. Hay que correrlo después de agregar una
  página, de tocar el FAQ o de correr `tools/build_juegos.py`. El precio del
  producto no se publica en el JSON-LD (`PRICE = None`) para que no quede uno
  viejo; si se completa, Google puede mostrarlo en los resultados.
- Las fichas de juego llevan su JSON-LD (`VideoGame`) desde la plantilla de
  `tools/build_juegos.py`. Juegos, Ecosistema y Sobre nosotros tienen un
  `BreadcrumbList` escrito a mano.
- **`llms.txt`**: resumen en Markdown para asistentes de IA. Hay que actualizarlo
  a mano cuando cambian los juegos o los datos del producto.
- **Analítica**: `analytics.js` carga Google Analytics 4 y Microsoft Clarity. Los
  dos IDs están al principio del archivo (buscar `ANALYTICS_ID`); con los valores
  de ejemplo no se carga nada, y en local tampoco. Los eventos propios los manda
  `script.js`: `click_comprar`, `descargar_stl`, `click_social`, `click_app`,
  `click_juego` y `faq_open`. La política de privacidad (sección 11) explica qué
  se mide.
