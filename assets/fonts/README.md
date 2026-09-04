# Tipografías

El sitio está preparado para las tres familias del diseño original. Hoy no están
los archivos, así que cada pila de `styles.css` cae en su sustituto de Google
Fonts. **Al dejar los `.woff2` en esta carpeta y añadir el bloque `@font-face` de
abajo, el cambio es automático**: no hay que tocar ninguna otra regla.

## Dónde usa cada familia el diseño

Medido sobre `ATL_Webfinal.pdf` (número de apariciones entre paréntesis):

| Familia | Uso en el diseño | Variable CSS | Sustituto actual |
| --- | --- | --- | --- |
| **Brillante Var** (148) | Titulares, antetítulos («04. TECNOLOGÍA»), botones, números de los pasos | `--font-display` | Playfair Display |
| **NHG Text Pro 55 Roman** (193) | Cuerpo de texto, navegación, etiquetas, preguntas del FAQ, enlaces del pie | `--font-text` (400) | Inter 400 |
| **NHG Text Pro 75 Bold** (39) | Párrafo destacado, títulos de los pasos, títulos de tecnología, «Redes» | `--font-text` (700) | Inter 700 |
| **NHG Display Pro 35 XLight** (4) | Los números 1–4 gigantes de las tarjetas de principios | `--font-display-sans` (200) | Inter 200 |
| **NHG Display Pro 75 Bold** (2) | Dos palabras sueltas; probablemente un desliz del archivo de diseño | — | — |

## Archivos que hacen falta

```
assets/fonts/
  brillante-var.woff2          Brillante Var (fuente variable)
  nhg-text-pro-55-roman.woff2  Neue Haas Grotesk Text Pro 55 Roman
  nhg-text-pro-75-bold.woff2   Neue Haas Grotesk Text Pro 75 Bold
  nhg-display-pro-35-xlight.woff2   Neue Haas Grotesk Display Pro 35 XLight
```

Si sólo hay `.otf` o `.ttf` de escritorio, sirven igual: se convierten a `.woff2`
con `fonttools` (reduce el peso a menos de la mitad).

## Bloque a añadir al principio de `styles.css`

```css
@font-face {
  font-family: "Brillante Var";
  src: url("/assets/fonts/brillante-var.woff2") format("woff2-variations");
  font-weight: 100 900; /* ajustar al eje real del archivo */
  font-display: swap;
}

@font-face {
  font-family: "Neue Haas Grotesk Text Pro";
  src: url("/assets/fonts/nhg-text-pro-55-roman.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Neue Haas Grotesk Text Pro";
  src: url("/assets/fonts/nhg-text-pro-75-bold.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: "Neue Haas Grotesk Display Pro";
  src: url("/assets/fonts/nhg-display-pro-35-xlight.woff2") format("woff2");
  font-weight: 200;
  font-display: swap;
}
```

Al activarlo hay que **quitar el `<link>` de Google Fonts** de las seis páginas
(`index`, `ecosistema`, `sobre-nosotros`, `user-manual`, `privacy-policy`,
`delete-account-guide`) y añadir en su lugar el precargado de las dos fuentes del
primer pantallazo:

```html
<link rel="preload" href="/assets/fonts/brillante-var.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/assets/fonts/nhg-text-pro-55-roman.woff2" as="font" type="font/woff2" crossorigin />
```

## Dos advertencias

1. **Licencia**: Neue Haas Grotesk y Brillante son comerciales, y la licencia de
   escritorio no cubre servir los archivos desde una web pública. Para publicarlos
   en `atlas-64.com` hace falta la licencia de uso web de cada una.
2. **Vista previa engañosa**: como los nombres de familia están en las pilas CSS,
   cualquiera que tenga las fuentes instaladas en su equipo las verá aunque no se
   hayan subido los archivos. El resto del mundo seguirá viendo los sustitutos.
   No juzgar el resultado desde una máquina con las fuentes instaladas.
