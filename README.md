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

1. **Videos**: el diseño prevé video en los héroes de Producto y Ecosistema y en la
   sección de la app. Hoy hay fotos; se reemplaza el `<img>` por un `<video autoplay
   muted loop playsinline poster="…">`.
2. **URL de compra**: los botones «Comprar Atlas» apuntan a
   `mailto:admin@wololabs.com`. Cambiar por la tienda cuando exista.
3. **Redes**: sólo Instagram tiene enlace; faltan Discord, TikTok, X y LinkedIn.
4. **Foto de la guía rápida** en «¿Qué incluye la caja?».
5. Las respuestas del FAQ están redactadas a partir del manual y de la lista de
   juegos nativos de la marca: conviene revisarlas antes de publicar.

`user-manual.html` tiene además su propia lista de datos pendientes en un comentario
al inicio del archivo.

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
