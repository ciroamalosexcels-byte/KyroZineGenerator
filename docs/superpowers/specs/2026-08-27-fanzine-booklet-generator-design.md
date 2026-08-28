# Generador de librito/fanzine cosido — diseño

**Fecha:** 2026-08-27
**Estado:** aprobado por el usuario, listo para plan de implementación

## 1. Resumen

Herramienta web de un solo archivo (`index.html` autocontenido, sin build) para armar
un librito fotográfico impreso y cosido (saddle-stitch) de N páginas — no el típico
fanzine de una hoja doblada, sino un libro de imprenta real armado con uno o varios
cuadernillos anidados. El usuario carga fotos y texto página por página, ve una vista
previa de lectura y una vista previa de imposición (cómo salen las hojas físicas), y
exporta un PDF listo para imprimir a doble faz (automático o manual) y coser por el lomo.

## 2. Referencia visual

Sitio de referencia: https://dirtylittlezine.com/ (analizado su HTML/CSS/JS).

**Se copia SOLO la estética e interfaz**, no la funcionalidad (ese sitio arma un
mini-zine de 8 páginas a partir de UNA hoja doblada dos veces y cortada — un
mecanismo distinto e incompatible con coser varias hojas en un libro).

Elementos visuales a replicar:
- Paleta monocroma sobre papel (`#f1f1f0` fondo, `#0a0a0a` tinta, un único acento
  navy `#1e3a6b` tipo sello de tinta) + textura de grano de papel (SVG turbulence
  inline) + tira de puntos halftone bajo el header.
- Tipografías (Google Fonts): `Special Elite` (etiquetas/botones, look máquina de
  escribir), `Mouse Memoirs` (logo/display), `Caveat` (manuscrita, detalles),
  `Inter` (UI general).
- Layout: header fijo arriba (logo + selector de tamaño de hoja + botón exportar
  "sello"), sidebar izquierda angosta con miniaturas de página arrastrables para
  reordenar, mesa de trabajo central oscura (`--stage: #18181b`) con el canvas de
  preview centrado y sombra dura, panel de edición inferior con controles
  contextuales según la página seleccionada, footer con links.
- Detalles: marca de registro de imprenta (círculo + cruz) en la esquina de la mesa
  de trabajo, bordes punteados entre paneles, sombras "offset" duras (no blur) en
  tarjetas y miniaturas, modales simples (cómo doblar/coser, acerca de, confirmar).

## 3. Modelo del librito (motor de imposición)

### 3.1 Parámetros globales del proyecto
- `sheetSize`: `"A4" | "A3"` — hoja física que se imprime. Define el tamaño final
  de página (A4 → páginas A5, A3 → páginas A4).
- `signatureSize`: `4 | 8 | 16` — páginas por cuadernillo. Se logra anidando
  `signatureSize / 4` hojas completas (sin cortar) una dentro de otra. No cambia
  el tamaño de página, solo cuántas hojas apiladas forman cada bloque cosido.
- `pageCount`: múltiplo de `signatureSize`. Si el usuario pide un número que no
  cierra, se redondea hacia arriba al múltiplo más cercano y se agregan páginas en
  blanco al final (con aviso de cuántas se agregaron).

*(Fuera de alcance v1: cortar una hoja grande en piezas más chicas antes de doblar
para mezclar tamaños de papel y ahorrar — anotado como v2.)*

### 3.2 Cuadernillos (signatures)
Con `C = pageCount / signatureSize` cuadernillos, el cuadernillo `k` (1-indexado)
cubre las páginas globales `[(k-1)*signatureSize + 1, k*signatureSize]`. Todos los
cuadernillos se cosen juntos por el mismo lomo, en orden, como un libro
convencional.

### 3.3 Imposición dentro de un cuadernillo
Dentro de un cuadernillo de tamaño `S`, hay `S/4` hojas. Para la hoja local `s`
(1-indexada, `1..S/4`), usando numeración local `1..S`:

```
frente-izquierda = S - 2s + 2
frente-derecha   = 2s - 1
dorso-izquierda  = 2s
dorso-derecha    = S - 2s + 1
```

La página global = página local + `(k-1) * signatureSize`.

Verificado con el caso clásico S=8: hoja 1 → frente [8, 1], dorso [2, 7]; hoja 2 →
frente [6, 3], dorso [4, 5]. Página 1 = tapa, página global final = contratapa.

Cada hoja física dentro de un cuadernillo con `S/4 > 1` es una hoja distinta que se
ANIDA (se mete una dentro de otra antes de doblar); todas del mismo `sheetSize`, a
tamaño completo.

## 4. Modelo de datos por página

```js
{
  id, index,              // posición en el libro (1..pageCount)
  type: "image" | "text" | "image+text" | "blank",
  image: {
    src,                  // dataURL o referencia a blob en localStorage
    rotation: 0|90|180|270,
    flipH, flipV,
    fit: "cover" | "contain",
    offsetX, offsetY, zoom,   // recorte/paneo dentro del canvas
    frame: { thickness, color },   // mm y color hex
  } | null,
  text: {
    content, font, size, align, vAlign, color,
  } | null,
  bgColor,                // fondo de página (relevante en modo "contain" o texto)
}
```

## 5. UI — estructura de componentes

- **Header**: logo, toggle `sheetSize` (A4/A3), selector `signatureSize` (4/8/16),
  campo `pageCount`, botón "Exportar" (abre panel/menú con las 2 opciones de PDF).
- **Sidebar** (izquierda): lista de miniaturas de página, arrastrables para
  reordenar (drag & drop nativo o pointer events, sin librería), botón "+" para
  agregar página, botón eliminar por miniatura, botón "Empezar de nuevo" (con
  modal de confirmación).
- **Mesa de trabajo** (centro): `<canvas>` con la página seleccionada renderizada
  a tamaño real (según `sheetSize`), marca de registro decorativa, toggle
  **Lectura / Imposición**.
  - *Modo lectura*: una página a la vez, navegación con flechas/teclado.
  - *Modo imposición*: muestra la hoja física completa (frente o dorso) del
    cuadernillo correspondiente a la página seleccionada, con líneas finas de
    plegado y rótulo "Cuadernillo X — Hoja Y — Frente/Dorso".
- **Panel de edición** (abajo): controles contextuales según `type` de la página
  seleccionada — uploader de imagen, orientación, fit, paneo/zoom (drag sobre el
  canvas + slider), marco (thickness + selector de color), editor de texto
  (contenido, fuente, tamaño, alineación, color).
- **Selector de color propio** (modal/popover, sin librerías): cuadrado de
  saturación/brillo dibujado en `<canvas>` + barra de tono + campo hex, reutilizado
  para color de marco, fondo de página y color de texto.
- **Cuentagotas**: botón que activa modo pipeta; al pasar sobre cualquier imagen
  cargada en el canvas y hacer click, lee el píxel con `getImageData` y aplica ese
  color al campo activo del selector de color.

## 6. Exportación

Botón "Exportar" ofrece dos PDFs (usando `jsPDF` vía CDN), ambos a 300 DPI, tamaño
de página = `sheetSize` real:
- **Dúplex automático**: una página de PDF por cada hoja física, frente y dorso
  intercalados en orden de impresión.
- **Manual**: primero todas las caras "frente" en orden, después todas las caras
  "dorso" en el mismo orden (para dar la pila vuelta a mano). Incluye una nota en
  pantalla (no en el PDF) sobre volteo por borde largo/corto según convención más
  común.

Cada hoja incluye líneas finas de plegado fuera del área de sangrado (guía visual,
no decorativas para el lector final).

## 7. Autoguardado y casos borde

- Autoguardado continuo en `localStorage` (proyecto completo, imágenes como
  dataURL) — recuperación automática al reabrir.
- `pageCount` no múltiplo de `signatureSize` → se redondea arriba y se agregan
  páginas en blanco al final, con aviso.
- Cambiar `signatureSize` o `pageCount` después de cargar contenido → se
  recalculan cuadernillos conservando el contenido ya cargado por índice de
  página; páginas nuevas quedan en blanco.
- Imágenes muy grandes: se limita/redimensiona al cargar para no saturar
  `localStorage` (límite práctico ~5-10MB por dominio).

## 8. Stack técnico

- Un solo `index.html` con CSS y JS inline, sin build ni dependencias instaladas
  localmente.
- `jsPDF` cargado por CDN (única dependencia externa) para exportar PDF.
- Renderizado de página y de imposición con `<canvas>` 2D nativo — sin librerías
  de UI ni de color picker.
- Google Fonts vía `<link>` (igual que la referencia).

## 9. Fuera de alcance (v1)

- Cortar hojas grandes en piezas más chicas para mezclar tamaños de papel.
- Colaboración multiusuario / cuentas / backend.
- Compensación de "creep/shingling" (corrimiento de márgenes en cuadernillos
  gruesos) — se puede agregar después si hace falta para cuadernillos de 16.
