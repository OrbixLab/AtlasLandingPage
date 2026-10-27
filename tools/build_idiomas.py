"""Pone en cada página su idioma, los hreflang, la barra y el pie.

El sitio es bilingüe: inglés en la raíz (idioma principal) y español en /es/.
Las rutas, la barra y el pie están en tools/sitio.py. Este script:

- recorre todas las páginas de RUTAS, en los dos idiomas, y rellena las marcas
  <!-- idiomas -->, <!-- barra --> y <!-- pie --> (la barra lleva el selector de
  idioma, que apunta a la misma página en el otro idioma);
- escribe las páginas de redirección de las direcciones viejas (REDIRECCIONES).

Uso: python tools/build_idiomas.py   (después de editar una página o tools/sitio.py)
"""
import sitio

faltan = []
for clave, lang, path in sitio.paginas():
    if not path.exists():
        faltan.append(str(path.relative_to(sitio.ROOT)))
        continue
    doc = path.read_text(encoding="utf-8")
    path.write_text(sitio.aplicar(doc, clave, lang), encoding="utf-8", newline="\n")

for viejo, destino in sitio.REDIRECCIONES.items():
    path = sitio.ROOT / viejo
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(sitio.redireccion(destino), encoding="utf-8", newline="\n")

if faltan:
    print("faltan estas páginas:\n  " + "\n  ".join(faltan))
print(f"listo: {len(sitio.paginas()) - len(faltan)} páginas y {len(sitio.REDIRECCIONES)} redirecciones")
