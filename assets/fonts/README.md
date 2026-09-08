# Tipografías

## Lo que se usa hoy

El estudio entregó **Helvetica Neue LT Std** en tres pesos, que es lo que sirve el
sitio. Están subseteadas a latín y convertidas a `woff2` (9 KB cada una, desde
~27 KB del `.otf` original):

| Archivo | Peso CSS | Uso |
| --- | --- | --- |
| `hn-55-roman.woff2` | 400 | Cuerpo de texto, navegación, etiquetas, enlaces |
| `hn-75-bold.woff2` | 700 | Párrafo destacado, títulos de tecnología, «Redes» |
| `hn-35-thin.woff2` | 200 | Los números gigantes de las tarjetas de principios |

Se declaran con `@font-face` al principio de `styles.css` bajo la familia
`"Helvetica Neue LT Std"`, y `--font-text` / `--font-display-sans` apuntan a ella.

Para regenerarlas desde los `.otf`:

```sh
python -m fontTools.subset "Helvetica Neue LT Std 55 Roman.otf" \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2022" \
  --layout-features=kern,liga,ccmp,locl --flavor=woff2 \
  --output-file=assets/fonts/hn-55-roman.woff2 --desubroutinize --no-hinting
```

## El display: Brillante

El titular del diseño es **Brillante Var**, que no llegó como archivo. No hace
falta: el estudio entregó cada titular **vectorizado en SVG** (`assets/titulos/`),
así que los titulares grandes son exactamente los del diseño. Escalan sin pérdida
y el texto va en el `alt`.

Lo que sí sigue con sustituto es el display pequeño —antetítulos («04. TECNOLOGÍA»),
botones y los números de los pasos—, que usa **Playfair Display** desde Google
Fonts a través de `--font-display`. Si algún día llega el archivo de Brillante,
basta con añadir su `@font-face` y ponerla primera en esa variable.

## Nota de licencia

Helvetica Neue LT Std es comercial (Monotype). La licencia de escritorio no cubre
servir los archivos desde una web pública: para `atlas-64.com` hace falta la
licencia de uso web. Los `.woff2` de esta carpeta se generaron a partir de los
`.otf` entregados por el estudio, dando por hecho que esa licencia existe o se
tramitará.
