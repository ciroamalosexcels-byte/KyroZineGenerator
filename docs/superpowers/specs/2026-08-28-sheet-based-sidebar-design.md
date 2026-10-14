# Panel de miniaturas basado en hojas — diseño

**Fecha:** 2026-08-28
**Estado:** aprobado por el usuario, implementado
**Ámbito:** solo `#sidebar` / `renderSidebar()` en `index.html`. No toca `#impose-panel`
(la vista grande de hoja con pliegue en modo "Imposición"), que sigue igual.

## 1. Origen

El usuario adjuntó un boceto a mano de una interfaz nueva para Kyro Zine Generator.
Pedido textual: el panel izquierdo no debe ser "una tira larga con todos los
números" (la lista vertical actual, una miniatura por página) sino "la hoja, un
rectángulo con proporción de una hoja ISO"; y dio un ejemplo: "si selecciona
dieciséis, tiene que mostrar en una carilla ocho y en otra carilla otra".

El boceto muestra una miniatura con un grid de 2 filas × 4 columnas (números
1,3,5,7 arriba / 2,4,6,8 abajo) dentro de un rectángulo, junto a los controles de
Hoja (A4/A3), Cuadernillo (4/8/16) y Páginas que ya existen en el header actual.

## 2. Por qué se agrupa de a máximo 2 hojas físicas por miniatura

Cada página mide `pageMm() = {w: sheetW/2, h: sheetH}` (portrait, proporción
1:√2 — la mitad de una hoja ISO horizontal). Si una miniatura ("carilla") muestra
`g` hojas físicas seguidas del mismo cuadernillo, en grid de 2 filas (frente/dorso)
× `2g` columnas, su proporción resultante es:

```
ratio = ancho/alto = (2g · pageW) / (2 · pageH) = g · (pageW/pageH) = g / √2
```

- `g=1` (cuadernillo de 4 → 1 hoja): ratio = 1/√2 ≈ 0.707 → proporción ISO vertical.
- `g=2` (cuadernillo de 8 → 2 hojas): ratio = 2/√2 = √2 ≈ 1.414 → proporción ISO
  horizontal exacta (coincide con una hoja A4/A3 completa). **Este es el caso que
  dibujó el usuario.**
- `g=4` (cuadernillo de 16 → 4 hojas): ratio = 4/√2 ≈ 2.83 → **no** es una
  proporción ISO (sería como pegar 2 hojas A4 de canto, un tamaño que no existe).

Por eso la regla es: **agrupar hojas de a máximo 2 dentro de un mismo cuadernillo**.
Con cuadernillo de 16 (4 hojas), esto da exactamente 2 carillas de 8 páginas cada
una — el ejemplo que pidió el usuario — y en cualquier tamaño de cuadernillo la
miniatura mantiene siempre una proporción ISO real (vertical con 1 hoja, horizontal
con 2).

## 3. Estructura de cada miniatura ("carilla")

- Contenedor `.sheet-thumb` con `aspect-ratio` fijado a `sheetW·g / sheetH`.
- Grid interno `.sheet-thumb-grid` de 2 filas × `2g` columnas.
- Orden de las celdas = **orden real de imposición física** (no orden de lectura):
  fila superior = caras "frente" de cada hoja del grupo (`front.left, front.right`
  por hoja), fila inferior = caras "dorso" (`back.left, back.right`). Se reutiliza
  `buildSheets()` (motor de imposición existente) sin modificarlo.
- Etiqueta bajo la miniatura: `Cuadernillo K — Hoja(s) N[-M]`.
- Cada celda (`.sheet-page-cell`) renderiza el contenido real de esa página
  (reusa `renderThumb()`) con el número de página superpuesto, y conserva el
  botón "×" para vaciar la página que ya existía.

## 4. Interacción

- **Clic** en una celda → selecciona esa página (`goToPage`), igual que antes.
- **Arrastrar y soltar**: como ahora la posición de cada página está fijada por el
  algoritmo de imposición (ya no es una lista libre), el drag & drop pasa de
  "insertar/reordenar" a **intercambiar el contenido entre dos páginas** (swap).
  Arrastrar la celda de la página 5 sobre la 12 intercambia lo que hay cargado en
  esas dos páginas; ninguna cambia de número de imposición.

## 5. Qué no cambia

- El motor de imposición (`buildSheets`, `findSheetForPage`) — reutilizado tal cual.
- El modo "Imposición" (`#impose-panel`, botón de vista previa de impresión) — sigue
  siendo la vista de hoja grande con pliegue y cruces de registro, sin cambios.
- El editor de página inferior (`#edit-panel`) y el stage central de lectura.

## 6. Modal "Vista previa" (libro terminado, no de impresión)

**Fecha:** 2026-08-28 (mismo día, iteración siguiente sobre este panel)

Pedido: un botón "Vista previa" en el panel izquierdo que muestre, en una ventana
emergente centrada, cómo queda el librito ya armado y leído de principio a fin —
no la imposición para imprimir, sino el resultado final — navegando página por
página con el mismo efecto de "pasar la hoja" (volteo 3D) que ya existía en el
stage de edición, y sin ningún número de página superpuesto en el render (el
número solo debe verse en las miniaturas del sidebar, para no perderse mientras
se edita, nunca en el contenido final).

**Refactor para reutilizar sin duplicar:**
- `currentViewPages()` se descompuso en funciones puras `viewPagesFor(idx)`,
  `prevViewIndex(idx)`, `nextViewIndex(idx)` — la lógica de paginación tipo libro
  (tapa sola, spreads de a 2, contratapa sola) no depende de qué "índice actual"
  se le pase.
- El dibujo de un spread en un canvas se extrajo a `renderPageSpread(canvas,
  viewPages, showHint)` — `renderStage()` (stage de edición) y `renderPreviewStage()`
  (modal) llaman a la misma función; `showHint` es la única diferencia (el modo
  edición dibuja el recuadro punteado de "falta foto", la vista previa no).
- La animación de volteo (antes `animatePageTurn`, atada a IDs fijos) se convirtió
  en una fábrica `makePager(canvas, view, viewPagesFn)` que devuelve un pager con
  su propio lock de animación (`flipping`) por closure. Se instancia una vez para
  el stage de edición (`mainPager`) y otra para el modal (`previewPager`), sin
  duplicar la lógica de la animación 3D.

**Estado independiente:** el modal tiene su propio índice (`previewIndex`),
separado de `state.currentIndex` — navegar la vista previa no mueve la página
seleccionada en el editor de abajo. Al abrir el modal, `previewIndex` arranca en
`state.currentIndex` (para poder chequear rápido la página en la que se está
trabajando).

**Controles:** botón "Vista previa" fijo (`position:sticky`) arriba de la lista
de carillas en `#sidebar`; dentro del modal, flechas ‹ › (mismo componente
`.nav-arrow` que el stage principal), botón × para cerrar, y teclado (flechas
para pasar página, Escape para cerrar) mientras el modal está abierto.

**Qué no cambia:** el sidebar de carillas (sección 3) sigue mostrando el número
de página como badge HTML aparte del canvas — nunca se dibuja en el propio
render de la página, así que ni las miniaturas del sidebar "contaminan" el
render final ni hace falta quitar nada para el modal de vista previa.

## 7. Corrección: la vista previa muestra hojas de impresión, no páginas de lectura

**Fecha:** 2026-08-28 (misma sesión, corrección sobre la sección 6)

El usuario aclaró que la vista previa no debía recorrer el libro en orden de
lectura (tapa, spread 2-3, spread 4-5...) sino mostrar la plancha de cada hoja
física tal como sale impresa — frente, dorso, frente de la hoja siguiente,
dorso, etc. — con posibilidad de hacer zoom con la rueda del mouse para
inspeccionar el resultado de cerca antes de imprimir.

- Se reemplazó `previewIndex` (índice de página de lectura) por
  `previewUnitIndex`, que recorre `previewUnits()`: una lista plana de
  `{sheet, side}` en el orden real de `buildSheets()` — sheet1-front,
  sheet1-back, sheet2-front, sheet2-back, etc.
- El label pasó de "Página X / Y" a "Cuadernillo K — Hoja N/M — Frente/Dorso",
  igual en formato al que ya usa `#impose-panel`.
- Al abrir el modal, se ubica la unidad correspondiente a la hoja/cara de la
  página actualmente seleccionada vía `findSheetForPage()` (motor de
  imposición ya existente).
- Zoom: rueda del mouse sobre `#preview-stage` escala el canvas (CSS
  `transform: scale()`, 1×–6×) centrado; con zoom activo se puede arrastrar
  para desplazarse por la imagen. El zoom se resetea a 1× en cada cambio de hoja/cara, y se
  resetea *antes* de que la animación de vuelta de página tome la instantánea
  del canvas (si no, el overlay de la animación quedaba con la geometría
  vieja, desincronizado del canvas ya reseteado).

## 8. Otras correcciones pedidas en la misma sesión

- **Sin emojis**: el ícono del botón "Vista previa" (antes un emoji 📖) se
  reemplazó por un SVG inline (un ojo), seleccionado con el estilo hand-rolled
  ya usado en el resto de los íconos.
- **Menú "Página" (⚙) apenas legible y demasiado ancho**: `#apply-pagecount`
  usaba la clase genérica `.mini-btn` (texto casi blanco pensado para el header
  oscuro) sobre el fondo claro del popover → invisible. Se le dio estilo propio
  (fondo navy, texto blanco) y se angostó el menú de 230px a 172px, forzando
  `width:100%` en las filas internas (el input de páginas tomaba su ancho
  nativo del navegador y se salía del contenedor porque nada lo forzaba a
  encoger).
- **Panel de edición sin pestañas**: se eliminó el concepto de `type` de
  página (`"blank"|"image"|"text"|"image+text"`) del modelo de datos. Ahora
  toda página tiene siempre un `image` y un `text` (nunca `null`); "vacío" es
  un estado derivado de que ninguno de los dos tenga contenido
  (`pageIsEmpty()`), no una categoría elegida a mano. El panel de edición
  muestra siempre las tres columnas (Imagen, Texto, Página) juntas, sin tabs, y
  agrega un botón "Dejar vacío" que resetea ambos slots. Layout compactado
  (controles más chicos, todo en una fila por grupo) para que entre sin
  scroll en los ~186px de alto del panel.
- **Bug preexistente encontrado al testear**: `.color-popover` fijaba
  `display:flex` incondicionalmente en CSS, así que el atributo/propiedad
  `hidden` nunca lo ocultaba de verdad — solo "parecía" cerrado porque su
  posición estática de respaldo caía fuera del viewport. Se agregó
  `.color-popover[hidden]{display:none}`, mismo patrón que ya usan `.modal` y
  `#sidebar` en este archivo.

## 9. Consolidación: un solo botón/función de vista previa, y fix de la animación

**Fecha:** 2026-08-28 (misma sesión, tercera ronda de correcciones)

El usuario señaló tres problemas más, con capturas: el conteo de hojas se veía
confuso, la animación de pasar página se veía "desfasada" (distorsionada)
específicamente en la tapa/contratapa, y el contenido de la vista de imposición
vieja aparecía corrido hacia la derecha en vez de centrado. Pidió además
eliminar el botón "Vista previa de impresión" del header (y el panel que abría)
y mover esa función al botón azul "Vista previa" del sidebar — es decir, dejar
un solo punto de entrada para ver las hojas.

### 9.1 Eliminación de `#impose-panel` y "Vista previa de impresión"

Como el modal de la sección 6/7 (botón azul) ya cubre exactamente esa función
—mostrar cada hoja física, frente y dorso, con contenido real— se eliminó por
completo la implementación vieja en lugar de arreglarle los bugs de conteo y
centrado: botón `print-preview-btn` del header, `<aside id="impose-panel">`,
`currentImposeRows()`, `renderImposePanel()`, los cinco listeners asociados
(`impose-back-to-pages`, `impose-flip-btn`, `impose-prev-sheet`,
`impose-next-sheet`, y el propio `print-preview-btn`), y los campos
`state.mode` / `state.imposeSide` / `state.imposeSheetIndex` (ya sin ningún
lector). `buildSheets()`/`findSheetForPage()` — el motor de imposición en sí —
no se tocaron; solo se quitó la UI vieja que los consumía.

Con esto, el botón azul "Vista previa" pasa a ser el único lugar para
inspeccionar cómo van a salir las hojas impresas, y su label se aclaró de
`Cuadernillo K — Hoja N/M` (N/M contaba solo las hojas *de ese cuadernillo*,
fácil de confundir con "el libro entero tiene M hojas") a
`Hoja (globalIndex)/(total del libro) — Cuadernillo K — Frente/Dorso`, usando
el número de hoja global que ya calculaba `buildSheets()`. Verificado con
Hoja A3, Cuadernillo 8, Páginas 16 (el caso reportado): ahora navega
correctamente "Hoja 1/4" → ... → "Hoja 4/4", sin ambigüedad (4 hojas físicas
= 16 páginas / 4, sea cual sea el cuadernillo elegido).

### 9.2 Fix: el punto de giro (lomo) ya no salta al entrar/salir de tapa o contratapa

**Causa raíz:** `#slide-view` centra el canvas del stage con flexbox
(`justify-content:center`). Un spread de 2 páginas y una página sola (tapa o
contratapa) tienen distinto ancho de canvas, así que cada uno se centra en una
posición distinta — el lomo de la tapa sola cae en un x diferente al lomo del
spread. La animación de vuelta de página (`makePager`) asume que el punto de
giro no se mueve entre el frame "antes" (instantánea vieja) y el frame
"después" (canvas ya actualizado por `changeFn`); como sí se movía, la
instantánea giraba en un lugar y el contenido real terminaba en otro —
exactamente el "desfase" reportado, visible solo en las transiciones tapa↔spread
y contratapa↔spread (las únicas donde el ancho del canvas cambia).

**Fix:** nueva función `alignStageCanvas(canvas, viewPages)`, llamada al final
de `renderStage()`. Para una página sola, aplica
`canvas.style.transform = translateX(±mitad del ancho de la página)` para que:
- Tapa (página 0): su borde **izquierdo** (lomo) quede exactamente en el centro
  del contenedor — la misma posición que ocupa el lomo de cualquier spread.
- Contratapa (última página): su borde **derecho** quede en ese mismo centro.

Verificado numéricamente en el navegador: con el spread mostrando páginas 2-3,
el punto medio del canvas fue x=877.99px (centro del contenedor: 878px); al
volver a la tapa, su borde izquierdo midió x=878px exacto — el lomo no se
mueve un píxel entre ambos estados, así que la animación ya no tiene ningún
salto que corregir. Mismo resultado, en espejo, para la contratapa.

**Efecto secundario esperado:** tapa y contratapa ya no aparecen perfectamente
centradas en reposo — quedan alineadas como si ocupasen el lado derecho/izquierdo
de un spread implícito (leve corrimiento hacia un costado). Es la consecuencia
directa de anclar el lomo a un punto fijo; se documenta acá por si el usuario
prefiere el centrado anterior y hay que buscar una solución distinta (por
ejemplo animar también el desplazamiento del spine en vez de fijarlo).

El modal de vista previa (`#preview-canvas`) no necesitó este fix: siempre
muestra 2 páginas (frente y dorso de una hoja), nunca una página sola, así que
nunca pasa por el caso que causaba el desfase.

*(Nota: la sección 10 reemplaza cómo arma el contenido este modal — ver más
abajo — pero la conclusión de que nunca pasa por un estado de 1 sola página
sigue valiendo igual.)*

## 10. Corrección: la vista previa debe mostrar la carilla completa, no frente/dorso por separado

**Fecha:** 2026-08-28 (misma sesión, cuarta ronda)

El usuario aclaró con una captura que el modal de "Vista previa" tenía que
mostrar exactamente lo mismo que ya muestra cada miniatura del sidebar (la
sección 3: grilla de 2 filas × N columnas, frente arriba y dorso abajo, para
el grupo de 1 o 2 hojas de esa carilla) — sólo que en grande y con el
contenido real, no separar frente y dorso en dos pantallas navegables como
había quedado en la sección 9.

**Cambio:** se reemplazó la navegación por "unidad = una cara de una hoja"
(`previewUnits`, 8 unidades para un libro de 4 hojas) por navegación directa
sobre `buildSheetGroups()` — la misma función que ya arma las miniaturas del
sidebar — así que ambas vistas (chica en el sidebar, grande en el modal) usan
exactamente el mismo agrupamiento y el mismo orden de páginas, sin poder
desincronizarse. Nueva función `renderCarillaPreview(canvas, group)` dibuja
la fila de frentes arriba y la fila de dorsos abajo (mismo orden que
`renderSidebar`), sin las etiquetas numéricas — esas son un recurso del
sidebar para no perderse mientras se edita (badge HTML aparte del canvas) y
nunca se dibujaron dentro del render en sí, así que la vista grande ya sale
"limpia" sin tocar nada más.

Como ahora cada pantalla del modal muestra la carilla completa (frente y
dorso a la vez, no una cara sola), ya no hace falta la animación de "vuelta de
hoja" ahí — pasar a la carilla siguiente es simplemente re-dibujar el canvas.
Se sacó el uso de `makePager` en el modal (`makePager` sigue existiendo y se
sigue usando tal cual para el stage de edición principal, sin cambios ahí).
El zoom con rueda y el arrastre para desplazarse, que no dependen de cómo se
arma el contenido, quedaron intactos.

**Nota sobre verificación:** a partir de esta ronda, el usuario pidió
explícitamente no volver a comprobar los cambios abriendo el navegador (ver
memoria `feedback_no_browser_verification` en el sistema de memoria del
proyecto) — la verificación de este cambio quedó limitada a revisión de
código y chequeo de sintaxis (`node -e` parseando el bloque `<script>`), sin
prueba visual en Chrome. El usuario prueba el resultado por su cuenta.

## 11. Corrección: navegación hoja por hoja + botón de girar (flip frente/dorso)

**Fecha:** 2026-08-28 (misma sesión, quinta ronda)

Con una captura, el usuario pidió agregar controles debajo de la imagen (no
flotando encima, donde con fondo blanco casi no se veían): flechas para pasar
de hoja, una etiqueta en el medio con el número de hoja y si es frente o
dorso, y un botón aparte con forma de flecha circular ("girar") que da vuelta
la hoja actual y muestra el otro lado con una animación de flip.

Esto reemplaza el diseño de la sección 10 (grilla con frente y dorso juntos):
ahora el modal vuelve a mostrar **una sola cara a la vez** (como un spread
normal de 2 páginas), pero con dos controles separados en vez de uno:

- **‹ / ›** (abajo, en una barra oscura fuera del área blanca de la página):
  cambian de **hoja** (recorren `buildSheets()` en orden, de principio a fin
  del libro), sin animación — simplemente redibujan. Al cambiar de hoja
  siempre se vuelve a mostrar su frente.
- **Botón de girar** (icono de flechas circulares, junto al texto del label):
  da vuelta la **misma hoja** de frente a dorso o viceversa, con una animación
  nueva — `makeCardFlipper` — que gira el spread completo 180° sobre su propio
  eje central, distinta de `makePager` (que gira una sola hoja de libro
  alrededor del lomo). No tenía sentido reusar `makePager` acá porque esa
  función asume que se gira una *hoja de libro* apoyada en el lomo; girar una
  *hoja física* para ver su dorso es conceptualmente una tarjeta que rota
  sobre su propio centro, no una página que se apoya en un canto.
- Label: `Hoja N/Total — Cuadernillo K — Frente|Dorso`.

Los controles se movieron de `.nav-arrow` flotantes (posición absoluta sobre
el canvas) a una barra `.preview-controls` fija abajo del `#preview-stage`,
justamente porque flotando sobre una página blanca quedaban casi invisibles
(el estilo `.nav-arrow` usa un fondo casi transparente pensado para verse
sobre el fondo oscuro de la mesa de trabajo, no sobre una hoja blanca).

Verificación: solo lectura de código + `node -e` parseando el `<script>` —
sin navegador, según la directiva de la sección anterior.

## 12. Corrección: "plancha" = el cuadernillo entero, no la hoja individual

**Fecha:** 2026-08-28 (misma sesión, sexta ronda)

El usuario aclaró que la sección 11 (una hoja a la vez + botón de girar)
deshizo lo que sí quería (la sección 10: frente y dorso juntos). Lo que
pedía en realidad era volver a mostrar frente+dorso juntos, pero acuñando el
término **"plancha"** para el conjunto completo de hojas de un cuadernillo —
sin el límite de 2 hojas que tiene el sidebar por motivos de proporción ISO
("no quería que me hagas el cuadernillo de vuelta [como el sidebar], para
qué quiero otro cuadernillo si ya lo tengo"). Ejemplo dado: con un cuadernillo
de 16 páginas (4 hojas), la plancha tiene que mostrar las 16 páginas del
cuadernillo completo — "las ocho [páginas] del frente y las ocho del dorso" —
en una sola pantalla, no partida en 2 como hace el sidebar.

**Cambio:** `previewCuadernillo` (1-indexado) reemplaza el modelo por hoja
individual de la sección 11. `cuadernilloSheets(k)` toma **todas** las hojas
de ese cuadernillo (`buildSheets().filter(s=>s.signature===k)`, sin cortar en
grupos de a 2), y `renderPlanchaPreview` dibuja fila de frentes arriba +
fila de dorsos abajo para esa lista completa — mismo principio de
`renderCarillaPreview` (sección 10) pero sin el límite de la sección 3.
Verificado con el caso de ejemplo (Cuadernillo 16, Páginas 16 → 1 solo
cuadernillo con sus 4 hojas): `renderPlanchaPreview` genera 8 columnas
(4 hojas × 2 páginas) por fila × 2 filas = 16 páginas exactas, "8 y 8",
coincide con lo pedido.

Los botones ‹ › (que ya se habían movido a la barra inferior en la sección
11 — eso sí quedó bien y no se tocó) ahora navegan entre **cuadernillos**,
no entre hojas ni entre lados. El botón de girar (flip frente/dorso) de la
sección 11 se sacó por completo — ya no hace falta, frente y dorso se ven
siempre juntos — junto con `makeCardFlipper`, que no se volvió a usar en
ningún otro lado.

Label: `Cuadernillo K/Total — N hoja(s)`.

Verificación: solo lectura de código + chequeo de sintaxis, sin navegador.

## 13. Guardar/cargar proyecto (.kyro), fuentes propias, marco a 0, todo a Poppins

**Fecha:** 2026-08-28 (misma sesión, séptima ronda)

Cuatro pedidos sueltos, todos chicos:

1. **Guardar/cargar proyecto como archivo** — hasta ahora el único respaldo
   era el autoguardado en `localStorage` (con su límite práctico de tamaño).
   Se agregó, en el menú "⚙ Página", un grupo "Proyecto" con **Guardar
   (.kyro)** (descarga `JSON.stringify(state)` completo — fotos como dataURL,
   posición/zoom/marco, textos, fuentes propias — como archivo `proyecto.kyro`
   vía un `<a download>` con Blob) y **Cargar proyecto** (input de archivo
   oculto, pide confirmación porque reemplaza el proyecto actual, y hace
   `Object.assign` sobre el estado por defecto igual que ya hacía `load()`
   desde localStorage). Como el archivo no tiene el límite de tamaño de
   localStorage, de paso sirve de respaldo cuando un proyecto con muchas
   fotos grandes ya no autoguarda.
2. **Subir fuentes propias** — botón "+" junto al selector de tipografía en
   el editor de texto, abre un input de archivo (`.ttf/.otf/.woff/.woff2`).
   `handleFontFile` lee el archivo como dataURL, lo registra con la CSS Font
   Loading API (`FontFace` + `document.fonts.add`) bajo un id único
   (`custom-<timestamp>`), lo agrega al array `FONTS` (así aparece en el
   desplegable) y lo guarda en `state.customFonts` (para que sobreviva al
   guardar/recargar — la propia registración en `document.fonts` es por
   sesión y hay que rehacerla en cada carga, por eso `registerCustomFonts()`
   corre en el arranque y también después de cargar un `.kyro`).
3. **Marco por defecto en 0** — `defaultImage()` tenía `thickness:5`; ahora
   `thickness:0` (sin marco hasta que el usuario le ponga uno a mano).
4. **Todas las fuentes a Poppins, por ahora** — pedido explícito de dejar
   *todo* en Poppins temporalmente e ir diferenciando después. Se cambiaron
   las variables CSS `--font-display`/`--font-hand`/`--font-typewriter` (antes
   Mouse Memoirs/Caveat/Special Elite) a Poppins, y las 4 entradas de `FONTS`
   (las que ve el usuario en el desplegable de texto de página) apuntan todas
   a Poppins en su `css`, **conservando los mismos `id`/`label`** — así cada
   vez que diferencien cada una más adelante, ningún proyecto guardado con
   `text.font==='hand'` (por ejemplo) se rompe: solo cambia qué tipografía
   real hay detrás de ese id.

Verificación: solo lectura de código + `node -e` parseando el `<script>` —
sin navegador, según la directiva vigente.

## 14. Rediseño de botones: planos, sin borde, sombra dura, animación al apretar

**Fecha:** 2026-08-29

Pedido: todos los botones de la app, sin excepción, deben quedar planos (sin
borde), con como mucho una sombra dura a 45° (offset, sin blur — el motivo
"sello de tinta" que ya usaban `.export-btn`/`.preview-btn` desde antes), y
con alguna animación al apretarlos.

- **Base compartida**: la regla global `button{...}` ahora incluye
  `border:none` y una transición común
  (`transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow, background,
  color`) — la curva con rebote (`cubic-bezier` con overshoot) es lo que le
  da el aire "curioso"/juguetón al volver a su lugar después de soltar el
  clic, sin tener que repetir la transición en cada clase.
- Cada clase de botón (`.mini-btn`, `.export-btn`, `.preview-btn`,
  `.clear-btn`, `.file-btn`/`.plain-btn`, `.icon-btn`, `.clear-page-btn`,
  `.nav-arrow`, `.preview-close`, `.preview-ctrl-btn`, `.cp-close`,
  `.cp-eyedrop`, `.sheet-page-cell .thumb-del`, `.upload-fab`,
  `.toggle-group button`) perdió su `border` y ganó una sombra dura chica
  (`Npx Npx 0 rgba(...)`, sin blur) más un par de reglas `:hover`/`:active`
  propias: la mayoría hace un levantamiento sutil al pasar el mouse
  (`translateY(-1px)` o `scale(1.1)`) y se "aplasta" contra su sombra al
  hacer clic (`translateY(1px)` + sombra más chica) — literalmente el efecto
  de estampar un sello. Los botones circulares de cerrar (`.cp-close`,
  `.preview-close`) giran 90° al pasar el mouse, un toque extra sin
  significado funcional pero divertido.
- **Excepción deliberada**: `.color-swatch` conservó su borde — no es
  decorativo, es lo único que delimita el cuadradito cuando el color
  elegido es blanco o muy claro sobre un fondo también claro. En su lugar
  se le agregó una animación de "apachurrado" (`scale(1.08)` hover /
  `scale(.92)` active).
- **Cuidado con `transform` usado para posicionar**: `.nav-arrow`
  (`translateY(-50%)` para centrarse verticalmente) y `.upload-fab`
  (`translate(-50%,-50%)` para centrarse en un punto) ya usaban `transform`
  para su propio posicionamiento — sus reglas `:hover`/`:active` combinan
  explícitamente ambos transforms (ej.
  `transform:translateY(-50%) scale(1.1)`) en vez de reemplazarlo, para no
  romper el centrado.
- **Bug encontrado de paso**: `.mini-btn` está pensado para el header oscuro
  (fondo casi transparente claro); pero también se reutiliza dentro de los
  modales claros (`#confirm-cancel`, vía un `style=""` inline que solo
  cambiaba el color de texto, no el fondo). Sin el borde de antes, ese botón
  hubiera quedado casi invisible sobre el fondo blanco del modal. Se agregó
  `.modal-box .mini-btn{background:var(--bg-card);box-shadow:...}` para que
  los botones de los modales (`Cancelar`, y de paso cualquier otro que no
  traiga su propio `background` inline) tengan un fondo y una sombra
  visibles ahí; los que sí traen `background` inline (`Confirmar`, `Cerrar`)
  no se ven afectados porque un estilo inline siempre gana.

Verificación: solo lectura de código, balance de llaves del CSS
(`{` == `}`) y chequeo de sintaxis del `<script>` — sin navegador.

## 15. La plancha también gira al cambiar de cuadernillo

**Fecha:** 2026-08-29

Desde la sección 12, ‹ › en la plancha redibujaban el canvas al instante, sin
animación (se sacó `makeCardFlipper` en esa ronda porque en ese momento se
usaba para el botón de frente/dorso que ya no existe). Ahora se pidió esa
misma animación de vuelta, pero aplicada a cambiar de **cuadernillo**.

Se reincorporó `makeCardFlipper(canvas, view)` — gira el canvas entero (todas
las filas y columnas juntas, no una sola hoja) 180° sobre su propio centro,
mismo mecanismo de instantánea + overlay que ya usa `makePager` para el
editor principal, pero sin el recorte en dos mitades (acá no hay un lomo de
libro: es una plancha completa reemplazando a otra). Ahora toma un parámetro
`direction` para que ‹ y › giren en sentidos opuestos, y los tres disparadores
(clic en ‹, clic en ›, flechas del teclado) llaman a `resetPreviewZoom()`
antes de animar — mismo motivo que en la sección 9: si no, la instantánea se
toma con el zoom que tenía el usuario puesto y queda desincronizada del
canvas ya reseteado por debajo.

Verificación: solo lectura de código + chequeo de sintaxis, sin navegador.

**Corrección inmediata:** el primer intento fijaba `transformOrigin` en
`'center center'` — giraba como una moneda sobre su propio eje. Se pidió que
gire desde un borde, como una hoja real dando una vuelta de 180°: se cambió a
`direction==='next' ? 'left center' : 'right center'`, mismo criterio de
bisagra que ya usa `makePager` en el editor principal.

## 16. Tema oscuro (mezclado con negros) + se saca la barra inferior

**Fecha:** 2026-08-29

Pedido: sacar la barra de pie de página ("Kyro Zine Generator" / "Todo se
guarda en tu navegador...") y pasar todo el cromo de la app a colores oscuros
mezclados con negro — **salvo** las hojas/páginas (que tienen que seguir
siendo blancas, son papel) y los botones (el acento navy `--stamp` no
cambia).

- **Barra inferior**: se borró `<footer class="app-footer">` y su CSS; el
  `.workspace` pasó de `calc(100vh - 50px - 30px)` a `calc(100vh - 50px)`
  (ya no hay que descontarle los 30px del footer).
- **Paleta**: como casi todo el cromo de la app ya usaba variables CSS
  (`--bg`, `--bg-card`, `--sidebar`, `--text`, `--muted`, `--border`), el
  grueso del cambio fue redefinir esas variables en `:root` a tonos oscuros
  (`--bg:#121214`, `--bg-card:#232326`, `--sidebar:#18181a`,
  `--text:#f2f1ee`, `--muted:#9b9b98`, `--border:#3a3a3e`) y dejar
  `--stamp`/`--stamp-dark` intactos. Las "hojas" (`.sheet-page-cell`,
  `.flip-back`, `#stage-canvas`, `#preview-canvas`, y todo el renderizado de
  página en JS) usan blanco *hardcodeado*, no la variable `--bg-card`, así
  que no se vieron afectadas — quedaron blancas como corresponde.
- **Bugs de contraste encontrados al revisar el cascadeo** (todos arreglados
  sin abrir el navegador, solo leyendo qué variable terminaba resolviendo
  cada regla):
  - `.export-btn` usaba `color:var(--bg)` como atajo para "texto claro" —
    tenía sentido cuando `--bg` era casi blanco, pero ahora es casi negro:
    texto casi negro sobre fondo navy. Se cambió a `color:#fff`.
  - `textarea`, `select.plain-select` y `.cp-row input[type=text]` no
    tenían `background`/`color` propios — dependían del blanco nativo del
    navegador más `color:inherit` (que ahora hereda el `--text` claro):
    texto casi blanco sobre fondo blanco, invisible. Se les dio
    `background:var(--bg-card);color:var(--text)` explícito.
  - `.modal-box` y `.export-menu` tenían el mismo fondo (`--bg-card`) que
    los botones que contienen (`.mini-btn` en los modales, `.plain-btn` en
    el menú de exportar) — en el tema claro se notaban igual por el
    contraste de la sombra dura contra un fondo blanco, pero con todo oscuro
    una sombra negra sobre un fondo casi negro no se ve: los botones se
    fundían con su propio contenedor. Se les cambió el fondo a `--sidebar`
    (un tono más oscuro que `--bg-card`) para que sus botones internos
    vuelvan a resaltar.
  - `#sidebar::-webkit-scrollbar-thumb` era `rgba(0,0,0,.15)` (invisible
    sobre el sidebar ahora oscuro) → `rgba(255,255,255,.15)`.
  - El grano de papel (`--grain`, un ruido SVG) tenía motas oscuras
    (`0 0 0 0 0.05` en el `feColorMatrix`) pensadas para notarse sobre un
    fondo claro; se invirtió a motas claras (`0 0 0 0 1`, con menos alfa)
    para que la textura siga siendo visible sobre el fondo oscuro.

Verificación: solo lectura de código + balance de llaves del CSS + chequeo
de sintaxis del `<script>` — sin navegador, según la directiva vigente.

## 17. Mejora de contraste sobre el tema oscuro

**Fecha:** 2026-08-29

Con una captura, el usuario pidió mejorar el contraste general — varios
botones (`Cómo coserlo`, `Página`, `EMPEZAR DE NUEVO`, los íconos de rotar/
alinear, `Dejar vacío`) se veían casi fundidos con el fondo oscuro que
recién se aplicó.

- **Paleta más separada**: `--bg-card` pasó de `#232326` a `#2c2c32`
  (más despegado de `--sidebar:#18181a`), `--text` a `#f6f5f2`, `--muted`
  a `#b6b6b2` (antes `#9b9b98`, contraste técnicamente aceptable pero se veía
  apagado en textos chicos), `--border` a `#4c4c52`.
- **Anillo sutil (`--ring`)**: variable nueva
  (`0 0 0 1px rgba(255,255,255,.14)`) — un contorno de 1px vía `box-shadow`
  (no la propiedad `border`, para no contradecir el pedido anterior de
  "sin bordes") que se sumó, combinado con la sombra dura existente, a todos
  los botones que antes dependían solo de una sombra oscura para separarse
  de un fondo que también es oscuro (`.mini-btn`, `.file-btn`/`.plain-btn`,
  `.icon-btn`, `.clear-btn`, `.clear-page-btn`, `.cp-eyedrop`,
  `.modal-box .mini-btn`, `.nav-arrow`, `.preview-ctrl-btn`,
  `.preview-close`). De paso se subió la opacidad de fondo/texto de estos
  botones "fantasma" (ej. `.mini-btn` de `rgba(...,.08)` a `.14`, texto de
  `.75` a `.92`).
- **`color-scheme: dark`** en `:root` — le avisa al navegador que la página
  es oscura, así los controles nativos (el `<select>` de tipografía al
  abrirse, el checkbox de "invertir orden de la pila") usan el estilo oscuro
  del propio navegador en vez del claro por defecto, sin tener que
  reconstruirlos a mano.
- **`accent-color:var(--stamp)`** en los `input[type=range]` (Zoom, Marco,
  Tamaño) y el checkbox — les da el tono navy de la marca en vez del gris
  genérico del sistema operativo, mejorando su visibilidad de paso.

Verificación: solo lectura de código + balance de llaves del CSS + chequeo
de sintaxis — sin navegador.

## 18. Se revierte el anclaje del lomo: página sola centrada + transición gradual

**Fecha:** 2026-08-29

El usuario prefirió otra solución para el problema original de la sección
9.2 (la animación de vuelta de página se veía "desfasada" entre tapa/
contratapa y un spread): en vez de anclar el lomo a un punto fijo
(`alignStageCanvas`, que corría la tapa/contratapa hacia un costado en vez
de centrarla), pidió que la página sola vuelva a mostrarse centrada en el medio
—como el spread— y que el CAMBIO de tamaño entre una página y dos sea
gradual, no instantáneo.

- Se sacó `alignStageCanvas()` y su llamada en `renderStage()` — el canvas
  vuelve a centrarse solo, vía el `justify-content:center` que ya tiene
  `#slide-view`, sin ningún `transform` de por medio.
- `#stage-canvas` ganó `transition:width .35s ease`. Como el alto de página
  no cambia entre una vista de 1 o 2 páginas (solo el ancho, que se duplica
  para un spread), animar `width` alcanza para que el cambio de tamaño —y
  como consecuencia el recentrado, porque flexbox recalcula el centro cada
  vez que el ancho cambia— se vea como un achique/agrandamiento gradual en
  vez de un salto.
- Efecto sobre la animación de vuelta de página: como `changeFn()` sigue
  actualizando `canvas.width`/`height` de forma síncrona dentro de
  `animatePageTurn`, ahora esa actualización dispara la transición de ancho
  en el canvas real *en paralelo* con los 600ms de rotación del overlay —
  el contenido real se desliza a su nueva posición mientras la instantánea
  gira encima, en vez de aparecer de golpe en el lugar nuevo.

Verificación: solo lectura de código + chequeo de sintaxis — sin navegador.

## 19. A4: 4 páginas por cara (2×2), PDF vertical, corte al medio

**Fecha:** 2026-10-13

Pedido: en A4 la hoja impresa debe traer 4 páginas por cara — contratapa arriba
a la izquierda y tapa arriba a la derecha en la hoja 1 — lista para imprimir a
doble faz en una impresora A4 y armar el librito, reacomodándose según la
cantidad de páginas.

- **`state.perFace`** (2 | 4). Por defecto A4 → 4, A3/A5 → 2 (A3 queda como
  estaba). Selector "Páginas por cara" en el menú Página. Proyectos viejos sin
  el campo toman el default según su tamaño (`layoutV` 3).
- **`buildPapers()`** arma las hojas físicas a partir de las hojas del librito
  (`buildSheets()`, sin cambios). A 4 por cara, el papel *j* lleva la hoja *j*
  arriba y la hoja *j+m* abajo (m = ⌈hojas/2⌉); si la cantidad es impar, la
  fila de abajo del último papel queda vacía. Al cortar la pila al medio y poner
  la pila de abajo debajo de la de arriba, las hojas quedan en orden 1..n.
  Ejemplo 16 págs: frente `[16|1]/[12|5]`, dorso `[2|15]/[6|11]`; papel 2 frente
  `[14|3]/[10|7]`, dorso `[4|13]/[8|9]`.
- Las filas tienen el mismo orden en frente y dorso: girar por el borde largo
  solo espeja izquierda/derecha, que `buildSheets()` ya contempla.
- Página = ¼ de la hoja (A4 → A6, misma proporción 1:√2 que antes).
- **PDF**: papel vertical, `DuplexFlipLongEdge`, marcas laterales de corte en
  el frente. Con 2 por cara sigue apaisado y `DuplexFlipShortEdge`.
- Sidebar: una miniatura por papel (frente 2×2 a la izquierda, dorso a la
  derecha). Vista previa "Hojas a imprimir": igual disposición.
- "Cómo coserlo" explica el corte y el reapilado.

Verificación: chequeo de sintaxis del `<script>` y de la imposición con node —
sin navegador, según la directiva vigente.

## 20. Papel + tamaño de página independientes, un solo librito, menú visual, estética

**Fecha:** 2026-10-13

Pedido: dejar de elegir "cuadernillo 4/8/16" y "páginas por cara". La persona
carga sus imágenes libremente y después define (1) en qué papel imprime (A3/A4)
y (2) qué tamaño tiene cada página del fanzine (A4/A5/A6). Siempre sale como
librito "posta": una sola pila anidada, con la contratapa al lado de la tapa en
la hoja 1.

- **Estado:** `sheetSize` (papel A4|A3) + `pageSize` (A4|A5|A6). Se eliminaron
  `signatureSize` y `perFace`; `layoutV` 4 migra proyectos viejos (A3 2/cara →
  A4, A3 4/cara → A5, A4 2/cara → A5, A4 4/cara o sin dato → A6).
- **`layoutFor(papel, página)`:** acomoda páginas verticales en el papel en la
  orientación que más entre, con columnas pares (pares izquierda/derecha).
  Combinaciones válidas: A4→A5 (2 por cara), A4→A6 (4), A3→A4 (2), A3→A5 (4),
  A3→A6 (8).
- **`buildPapers()`:** el papel *j* lleva las hojas del librito *j + k·m* en cada
  "slot" *k* (m = ⌈hojas/slots⌉). Cortando la pila en tiras y reapilándolas en
  orden queda 1..n. El dorso de cada hoja va en el spread espejado (volteo por el
  borde largo). Verificado por script para las 5 combinaciones y 4–60 páginas.
- **Panel izquierdo:** muestra el librito en orden de lectura (tapa a la derecha,
  spreads, contratapa a la izquierda); la imposición solo existe en la vista
  previa "Hojas a imprimir" y en el PDF (con marcas de corte en el borde).
- **Menú Página:** dibujos que se tocan — papel (A4/A3 a escala) y tarjetas del
  papel dividido en secciones por cada tamaño de página posible.
- **Cómo coserlo:** pasos con dibujos generados con la imposición real (hoja 1
  con sus números, líneas de corte numeradas, reapilado, doblez, grampas).
- **Estética:** tema "fotocopia": papel crema, tinta negra, rojo bermellón,
  resaltador amarillo, colchoneta de corte verde detrás de las páginas;
  Anton + Archivo + Courier Prime; sin degradés ni vidrio; sombras duras de
  tinta; leve rotación en miniaturas y pasos (ver criterios en
  `Wmezatec/06_Landing_web/NOTAS_DISENO.md`).

Verificación: sintaxis del `<script>`, ids del DOM y simulación de la
imposición con node — sin navegador, según la directiva vigente.

## 21. Herramientas tipo Photoshop, pliego, volteo corregido, botones sin borde

**Fecha:** 2026-10-13

- **Volteo de página:** el lienzo del editor siempre mide dos páginas; la tapa
  se dibuja en la mitad derecha y la contratapa en la izquierda (libro cerrado
  sobre la mesa), así el lomo no se mueve. La hoja que gira es siempre una
  mitad: la cara de adelante es la página que se levanta y la de atrás es la
  página real que queda del otro lado (leída del lienzo ya redibujado), con
  perspectiva 3D. Una imagen fija de la mitad que va a tapar se queda debajo
  hasta que aterriza.
- **Pliego** (botón en el panel de imagen, solo en págs 2…N-1): una imagen para
  las dos páginas enfrentadas. Se guarda en `state.spreads[izquierda]`; cada
  página dibuja su mitad, así que al imprimir (páginas en hojas distintas)
  sigue alineada.
- **Herramientas** (barra sobre el lienzo, atajos entre paréntesis): Mover (V),
  Escalar y rotar (R), Recortar (C), Texto (T), Pincel (B), Goma (E), Mano (H /
  espacio), Lupa (Z). Transformar: esquinas escalan proporcional; **Shift**
  deforma (`scaleX/scaleY`); **Alt** escala desde el centro; el círculo superior
  rota (Shift = de a 15°). Recortar: `image.crop` en fracciones, sin reescalar
  lo que queda. Flechas: mover 1 mm (Shift 5 mm); Re Pág / Av Pág cambian de
  página. Texto con `offsetX/offsetY/rotation`. Dibujo en `page.strokes`
  (vectores en mm, la goma solo borra tinta).
- **Campos numéricos** en lugar de sliders: se escribe el valor, ↑/↓ ajustan
  (Shift ×10) y arrastrar la etiqueta lo "frota".
- **UI:** una sola tipografía (Archivo, más grande), botones y campos en
  píldora, sin bordes, con sombra dura y animación de apretado; íconos SVG
  estilo Lucide en lugar de caracteres.

Verificación: sintaxis, ids del DOM y una corrida de humo del script con un
DOM simulado — sin navegador, según la directiva vigente.

## 22. Libro que se desliza, 3D en 2D, pinceles, deshacer, archivos .kyro

**Fecha:** 2026-10-13

- **Página sola centrada y deslizante:** `#book` envuelve el lienzo (siempre de
  dos páginas); tapa/contratapa lo desplazan ±¼ de ancho con una transición del
  mismo largo que el volteo. La hoja que gira, la imagen fija y los "+" viven
  dentro de `#book`, así se mueven juntos.
- **Cutmat completo:** `#stage-scroll` ocupa todo el fondo verde; las barras
  (herramientas, alineación, zoom) flotan encima. Sin líneas entre paneles.
  La rueda hace zoom del libro (hacia el cursor); botón central o espacio
  desplazan la vista.
- **Overlay `#stage-overlay`:** margen de 70 px alrededor del libro con la
  imagen que se sale a 40 % de opacidad y los tiradores de transformar/recortar
  (se pueden agarrar fuera de la página).
- **Alinear:** izquierda / centro / derecha, arriba / medio / abajo y centrar,
  contra los bordes de la página (o del pliego).
- **Deshacer/rehacer:** Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z; copias estructurales
  (las imágenes se comparten por referencia), una por cada `save()`.
- **Pinceles (10):** lápiz, bolígrafo, marcador, pincel suave, acuarela,
  aerógrafo, carbón, tiza, resaltador, caligrafía; la goma usa los mismos con
  `destination-out`. Grosor y opacidad (rueda sobre el campo, `[` `]`),
  presión de la tableta (Pointer Events), anillo que muestra la punta real.
  Los trazos guardan semilla: se redibujan idénticos.
- **Vista previa:** por defecto "Hojas". "Librito" es una escena 3D de software
  dibujada en canvas 2D (cuadrículas de triángulos con mapeo afín, estilo
  PS1): libro abierto a 140°, se orbita arrastrando, las hojas giran sobre el
  lomo.
- **Archivos:** Guardar / Guardar como… / Abrir… con el selector del sistema
  (File System Access API) y respaldo por descarga; siempre `.kyro`. Ctrl+S.
- **Imágenes:** JPG, PNG, TIFF (UTIF) y RAW (se usa el JPEG grande embebido).
- **Miniaturas** a ~360 px de ancho; el lienzo del editor a ~145 dpi.

Verificación: sintaxis, ids y corridas de humo con DOM simulado (pinceles,
escena 3D, instructivo, historial) — sin navegador, según la directiva vigente.

## 23. Librito 3D con grosor, mesa a 45° y arreglos

**Fecha:** 2026-10-13

- **Escena:** el libro está acostado sobre el cutmat (plano z=0) con fondo gris
  oscuro; cámara a ~45° (`pitch` 0.8). Arrastrar horizontal gira el libro sobre
  la mesa (sin límite), vertical lo inclina hasta ver por debajo, y el botón
  "Dar vuelta" lo pasa al otro lado. Rueda arriba acerca, rueda abajo aleja.
- **Grosor:** cada pila (izquierda/derecha del lomo) mide `hojas × 0.013`
  (tope 0.3); se dibujan el canto exterior y los cantos superior/inferior con
  líneas de hojas.
- **Bug "siempre la página 2 a la izquierda":** la hoja inferior de la pila
  izquierda se desplazaba hacia la cámara en vez de alejarse (el normal de esa
  cara apunta al revés), así que se dibujaba encima. Ahora los desplazamientos
  van "hacia arriba de la mesa" para ambos lados.
- **Tiradores recortados:** el overlay cubre todo el escenario (no solo libro +
  70 px), y los eventos de puntero se escuchan en toda la mesa.
- **Selección de texto** desactivada salvo en campos de texto.

## 24. Instructivo revisado, libro parado y campos con rueda

**Fecha:** 2026-10-13

- **Instructivo:** el paso 3 ya no habla de "pilas" sino de **tiras**: después de
  cortar se juntan las tiras de la misma posición (todas las 1, todas las 2…)
  y se ponen la 2 debajo de la 1, etc. (verificado por simulación: ese orden
  da las hojas 1..n). El doblez muestra la hoja abierta → hoja doblada con el
  lomo a la izquierda; "una dentro de otra" dibuja V paralelas vistas desde
  arriba; la grampa son dos barras finas a lo largo del doblez, sin números.
- **Librito 3D:** vuelve a estar parado sobre la mesa (cutmat horizontal),
  hojas más finas (`0.006` por hoja), la hoja que gira se curva, el giro usa
  easing cúbico (1 s) y la órbita se suaviza hacia el destino. Arrastrar hacia
  abajo inclina el libro mostrando más su parte superior; horizontal gira
  sin límite. "Dar vuelta" gira 180°.
- **Bug del destello de la página de atrás:** la hoja que aterrizaba quedaba
  0.02 por debajo del tope de la pila izquierda; ahora su altura final es la de
  la pila con ella incluida.
- **Campos numéricos:** la rueda sobre cualquier campo suma (arriba) o resta
  (abajo); Shift ×5. La presión del lápiz es un nivel de 0 a 100 %.

## 25. Panel derecho con capas; texto en la barra de arriba

**Fecha:** 2026-10-13

- **Texto → barra superior:** con la herramienta Texto la barra de arriba trae
  el cuadro de texto, fuente (+ fuente propia), tamaño, rotación, alineación
  horizontal/vertical y color, igual que el pincel.
- **Panel de abajo → columna a la derecha** (296 px, vertical). Sección
  **Capas** (Imagen, Dibujo, Texto y Fondo fijo): ojo para ocultar, subir/bajar
  el orden de dibujo, clic para seleccionar. Orden y visibilidad se guardan por
  página (`page.order`, `page.hidden`) y rigen también en la exportación.
  Debajo: controles de imagen y fondo.
- **Panel izquierdo** más angosto (158 px).

## 26. Texto libre, capas borrables, imágenes extra, "Doble"

**Fecha:** 2026-10-13

- **Texto como en Photoshop:** con la herramienta Texto, un clic crea texto de
  punto (se escribe donde se hizo clic) y arrastrar dibuja una caja de texto de
  área (ajusta el renglón al ancho). Clic sobre el texto lo edita, arrastrarlo lo
  mueve, y los tiradores laterales cambian el ancho de la caja; la esquina
  escala la letra y el círculo rota. Campos nuevos `fx, fy, fw` (mm); sin `fx`
  rige el modo anterior centrado en la página.
- **Fuentes de la computadora** (Local Font Access API, Chrome/Edge) con el botón
  "Mis fuentes"; el selector tiene la flecha con aire.
- **Capas:** botón de basura por capa y tecla Supr/Retroceso sobre lo
  seleccionado. "Agregar imagen" crea imágenes extra dentro de la página
  (`page.extras`, capas `extra:<id>`), cada una con su propia transformación.
- **"Pliego" → "Doble"** (una imagen en las dos páginas enfrentadas). "Vaciar"
  quedó debajo.
- **3D:** el culling de caras usa el vector hacia la cámara (perspectiva
  correcta, ya no desaparece el canto), la mesa se recorta contra el plano
  cercano y es mucho más grande, y la cámara no baja de la mesa.


---

# Registro de la sesión del 12–13 de octubre de 2026 (versión 0.9.0)

Versión estimada: **0.9.0**. Partimos de la 0.2 (spec del panel de hojas e
`index.html` de fines de agosto) y esta sesión sumó casi todo lo que hoy es la
herramienta: imposición real de zine, herramientas de edición, dibujo, capas,
vista previa 3D, archivos `.kyro` con autoguardado y una nueva identidad
visual. Falta pasarla por mucho uso real y por Firefox/Safari para llamarla 1.0.

## Impresión e imposición
- **Papel y página independientes:** se elige el papel (A3 o A4) y el tamaño de
  cada página del zine (A4, A5 o A6). Combinaciones válidas: A4→A5 (2 por cara),
  A4→A6 (4), A3→A4 (2), A3→A5 (4), A3→A6 (8).
- **Un solo zine anidado:** ya no hay cuadernillos de 4/8/16. Se imprime a doble
  faz, se corta en tiras, se juntan las de la misma posición, se doblan las
  hojas, se meten una dentro de otra y se grampa desde adentro.
- **Imposición verificada por simulación** para las 5 combinaciones y de 4 a 60
  páginas (el dorso queda detrás de su frente y las hojas salen en orden 1…n).
- **PDF** vertical u horizontal según el papel, con marcas de corte en el borde y
  la bandera de doble faz correcta (borde largo / corto).
- **Selector visual** de papel y tamaño de página (dibujos que se tocan).
- **Instructivo "Cómo armarlo"** con dibujos generados con la configuración
  real: imprimir, cortar, juntar las tiras, doblar, una hoja dentro de otra y
  grampar desde adentro (dos grampas finas sobre el doblez).

## Edición en el escenario
- **Mesa de corte verde** ocupando todo el fondo, con las barras flotando encima;
  Tab oculta todos los paneles y deja solo la mesa y el header.
- **Página sola centrada** que se desliza al abrir o cerrar; el volteo de página
  usa el contenido real en ambas caras, con perspectiva.
- **Zoom de la vista** con la rueda (hacia el cursor), lupa con clic / Alt /
  clic derecho, mano con barra espaciadora o botón central.
- **Herramientas:** mover, escalar y rotar (Shift deforma, Alt desde el centro),
  recortar, texto, pincel, goma, mano y lupa. Atajos V R C T B E H Z.
- **Flechas** mueven 1 mm (Shift 5 mm); Re Pág / Av Pág cambian de página.
- **Tiradores visibles fuera de la página**, con la parte que se sale a
  media transparencia.
- **Alineación** contra los bordes o el centro de la página (imagen, texto y
  dibujo).
- **Cursor del mouse** con el ícono de cada herramienta.
- **Deshacer / rehacer** (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z) con botones arriba a la
  izquierda; el cambio de color en vivo cuenta como un solo paso.

## Imagen, texto y dibujo
- **Capas por página:** Imagen, Dibujo, Texto, imágenes extra y Fondo fijo; ojo
  para ocultar, basura, y reordenar arrastrando con animación. Orden y
  visibilidad también valen en el PDF.
- **Agregar imagen:** imágenes extra dentro de la página, cada una con su
  transformación. **Doble:** una imagen en las dos páginas enfrentadas
  (antes "Pliego").
- **Texto como en Photoshop:** clic = texto de punto, arrastrar = caja de
  texto; marco con tiradores desde que se crea vacío; fuentes propias y fuentes
  de la computadora (Chrome/Edge).
- **Pinceles:** 10 (lápiz, bolígrafo, marcador, pincel suave, acuarela,
  aerógrafo, carbón, tiza, resaltador, caligrafía); la goma usa los mismos.
  Presión de tableta (Pointer Events) sobre tamaño y opacidad, tamaño mínimo,
  curva y estabilizador; anillo que muestra la punta real.
- **Campos numéricos:** se escribe el valor, ↑↓ de a uno, la rueda de a uno
  (Shift ×5) y se arrastra la etiqueta; números centrados entre sí.
- **Panel derecho contextual** (imagen / texto / dibujo) agrupado en categorías.
- **Imágenes JPG, PNG, TIFF y RAW** (de los RAW se usa el JPEG grande embebido).
- **Se quitó** el marco de la imagen (ya lo cubre el fondo) y los sliders.

## Vista previa
- Encabezado con título, especificaciones y cruz de cerrar; abre en **Hojas**
  (sin cortar) y tiene el modo **Zine**.
- **Zine 3D** hecho en canvas 2D (estilo PlayStation): parado sobre la mesa,
  abierto a 140°, hojas finas con grosor según la cantidad, la hoja que gira se
  curva, órbita suave con inercia, "Dar vuelta" para ver la contratapa.
- Se corrigieron: orden de dibujo de las hojas (siempre se veía la página 2),
  cantos que desaparecían con la perspectiva y la mesa que se rompía al bajar.

## Archivos y guardado
- **Guardar, Guardar como… y Abrir…** con el selector del sistema; siempre
  `.kyro`; Ctrl+S.
- **Autoguardado** en el navegador (localStorage + IndexedDB, sin tope de 5 MB)
  y, una vez elegido el archivo, en el propio `.kyro`; estado visible en el
  header y reconexión con un enlace subrayado.
- Al restaurar se precargan también las imágenes extra y las de "Doble".

## Identidad visual y comodidad
- Estilo de fotocopia: papel crema, tinta negra, rojo y resaltador amarillo, una
  sola tipografía (Archivo). Sin degradés.
- Botones sin borde, en píldora o círculo, con sombra dura y animación al apretar;
  los seleccionados llevan una línea fina entre botón y sombra.
- **Íconos** SVG estilo Lucide; tooltips unificados en una pastilla oscura.
- **Barras de scroll** propias (en Chrome; la del panel izquierdo va a la
  izquierda, sin flechas).
- **Modo oscuro** (Ajustes → Apariencia).
- **Ajustes → info:** para qué existe la herramienta, el agradecimiento, la firma
  y la versión.
- Texto no seleccionable fuera de los campos; "librito" pasó a "zine" en toda la
  interfaz.

## Conocido / pendiente
- La presión de la tableta depende de que Windows Ink esté activo en el driver
  Wacom (la barra del pincel muestra si llega como "tableta" o "mouse").
- Fuentes del sistema y archivo de autoguardado: solo Chrome y Edge.
- Nunca se probó en Firefox ni Safari; todo lo anterior se verificó con
  simulación y revisión de código, y con las pruebas manuales del propio autor.
- Ideas que quedaron: varias cajas de texto por página, panel 3D en vivo mientras
  se edita, más formatos de papel.

## Agregado posterior (misma sesión)
- **Deshacer persistente:** el historial (hasta 30 pasos) se guarda dentro del
  `.kyro` y en el autoguardado; al recargar o reabrir se puede seguir con
  Ctrl+Z. Formato 2: las imágenes van una sola vez en una tabla `images` y el
  estado y los pasos apuntan a ella, así el historial no multiplica el peso.
  Los archivos viejos (estado suelto) se siguen abriendo.
- **Selección de página** como un corchete por fuera de la página (arriba, abajo
  y el lado exterior), sin dibujar nada encima de la imagen.
- **Modo "Libre"** de ajuste de imagen: el tamaño no se reajusta al rotar.
- Cursores del sistema en lugar de íconos propios; la lupa mantiene su cursor
  con el clic derecho.
