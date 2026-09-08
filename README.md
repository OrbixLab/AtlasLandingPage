# Atlas — sitio web

Sitio estático de Atlas (atlas-64.com), publicado con GitHub Pages. Sin build ni
dependencias: HTML, un CSS y un JS.

## Estructura

| Archivo | Página | Origen |
| --- | --- | --- |
| `index.html` | Producto | página 1 del diseño `ATL_Webfinal.pdf` |
| `ecosistema.html` | Ecosistema | página 2 del diseño |
| `sobre-nosotros.html` | Sobre nosotros | página 3 del diseño |
| `user-manual.html` | Manual de usuario y avisos de seguridad | contenido propio |
| `privacy-policy.html` | Política de privacidad | contenido propio |
| `delete-account-guide.html` | Guía para eliminar la cuenta | contenido propio |
| `descargar.html` | Descarga del APK de AtlasHub | contenido propio |

Cada página tiene además una copia idéntica en su carpeta (`ecosistema/index.html`,
etc.) para que la URL funcione sin `.html`. **Al editar una página hay que copiarla
a su carpeta**:

```sh
for p in ecosistema sobre-nosotros descargar user-manual privacy-policy delete-account-guide; do
  cp "$p.html" "$p/index.html"
done
```

- `styles.css` — sistema de diseño completo (tokens, bandas, componentes y las
  páginas de documentación).
- `script.js` — menú móvil y animación de entrada al hacer scroll.
- `assets/` — fotos de producto, marca y favicons.

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
  (logotipo ATLAS) y `assets/logo-atlas64-*.png` (lockup completo con «64 · el mapa
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
`.hero__scrim--soft`, más liviano, porque su foto ya es clara y los titulares
llevan contorno propio.

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

## Descarga del APK

`descargar.html` sirve AtlasHub desde Google Drive: el archivo pesa 239 MB y no
entra en el repositorio (GitHub rechaza más de 100 MB). El botón apunta al
endpoint de descarga directa, con `confirm=t` para saltear la pantalla de aviso
que Drive interpone en archivos grandes.

Versión publicada: **1.0.0** · 239 MB · Android 10+ ·
SHA-256 `a311993828888a054cdc17b836070ad944b7f8b1f5975fab6a18a5fbcd02c2b7`.

Para publicar una versión nueva hay que actualizar, en `descargar.html`, el ID del
enlace, el SHA-256 y los datos de versión y tamaño de la tarjeta.

**Límite conocido**: Drive corta las descargas de un archivo durante 24 h al
superar su cuota diaria, y devuelve un error a todo el mundo. Si el volumen
crece, conviene mover el archivo a un alojamiento sin esa restricción.

## Ver el sitio en local

```sh
python -m http.server 8080
# http://127.0.0.1:8080/
```
