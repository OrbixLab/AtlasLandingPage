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
- **Tipografía**: el diseño usa *Brillante Var* (titulares), *Neue Haas Grotesk
  Text Pro* (cuerpo) y *Neue Haas Grotesk Display Pro 35 XLight* (los números
  gigantes). Las pilas de `styles.css` ya las nombran y caen en **Playfair
  Display** e **Inter** mientras no estén los archivos. Para activarlas hay que
  dejar los `.woff2` en `assets/fonts/` y añadir el bloque `@font-face`:
  instrucciones completas en [`assets/fonts/README.md`](assets/fonts/README.md).
- **Marca**: `assets/icon-atlas-*.png` (isotipo), `assets/wordmark-atlas-*.png`
  (logotipo ATLAS) y `assets/logo-atlas64-*.png` (lockup completo con «64 · el mapa
  de mundos»), en versión oscura, clara y amarilla.

## Pendientes marcados en el código

Buscar `PENDIENTE` en los `.html`:

1. **Heros de Ecosistema y Sobre nosotros**: en el diseño, los tres heros ocupan
   la primera pantalla entera con el medio de fondo y el contenido superpuesto
   (ver «Estructura del hero»). Sólo Producto está así; los otros dos siguen con
   el título arriba y la foto en un panel aparte. Convertirlos requiere imágenes
   con resolución suficiente para fondo a pantalla completa. La sección de la app
   en Ecosistema también prevé video en el diseño.
2. **URL de compra**: los botones «Comprar Atlas» apuntan a
   `mailto:admin@wololabs.com`. Cambiar por la tienda cuando exista.
3. **Redes**: sólo Instagram tiene enlace; faltan Discord, TikTok, X y LinkedIn.
4. **Foto de la guía rápida** en «¿Qué incluye la caja?».
5. Las respuestas del FAQ están redactadas a partir del manual y de la lista de
   juegos nativos de la marca: conviene revisarlas antes de publicar.

`user-manual.html` tiene además su propia lista de datos pendientes en un comentario
al inicio del archivo.

## Estructura del hero

Medido sobre el diseño, la primera pantalla es una caja de 1920×1080 con el medio
al fondo y **el contenido encima**: titular al 18,4 % de la altura, párrafo y
botones apoyados abajo (terminan al 93,4 %) y márgenes laterales del 6 %. Eso es
`.hero--overlay` en `styles.css`; las otras dos páginas todavía usan la variante
antigua, con el medio en un panel aparte.

El control de pausa vive en la fila intermedia de la retícula —vacía en el
diseño—, así que no puede solaparse con el titular, el párrafo ni los botones sea
cual sea el tamaño de pantalla.

El velo (`.hero__scrim`) no es decorativo: el texto del diseño es `#1e1e1e` y el
video llega a negro puro en las bandas del titular y del pie, así que hace falta
un 53 % de blanco para alcanzar 4,5:1. El degradado aplica 0,58–0,70 en esas dos
bandas y baja a 0,14 en la franja central, donde no hay texto y el video se ve
casi limpio.

Nota: el diseño dibuja la barra de navegación flotando **dentro** de la primera
pantalla (x 83..1836, y 40..121), no como barra a sangre. Aquí es una barra fija a
todo el ancho, que funciona mejor en las cuatro páginas sin hero.

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
