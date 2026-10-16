# Registro de cambios KyroZine

Lo más nuevo va abajo del todo. Las ideas por hacer están en IDEAS.md.

## Registro de lo hecho (versión 1.3.0 del instalador y después)

- Selección (S): marco, círculo, lazo y pluma recta; copiar/cortar/pegar, borrar, recortar fuera, pasar a capa nueva, mover/escalar/girar trazos, pintar solo dentro.
- Capas: candado, renombrar con doble clic, arrastrar desde el icono.
- Exportación: presets Borrador / Para imprimir (300 dpi) / Máxima calidad, exportar una hoja sola.
- PDF: se importa desde el "+" de la hoja; páginas o imágenes sueltas, elegir a qué hoja va cada una.
- Colaboración: internet (Supabase), red local (programa de escritorio) y conexión directa (WebRTC con QR); cursores, presencia, chat con historial (viaja al entrar y se guarda por sala), "Salas cerca", perfil con 30 iconos y 12 colores, código de sala por sonido.
- Voz robótica (SAM, español rioplatense): apagada por defecto, interruptor en Ajustes y junto al chat.
- Escritorio: instalador NSIS por usuario (`desktop\dist\Kyro-Zine-Generator-Instalador-1.3.0.exe`), servidor LAN, icono sin borde negro.
- Celular (≤700px): barra de herramientas fija abajo, colaboración a pantalla completa.
- Zoom con la rueda (9e3cb39, 2808c70):
  - El libro ya no se corre a la derecha: el corrimiento de tapa/contratapa se aplica al instante, sin la animación de 0,8 s.
  - Girar la rueda rápido siempre hace zoom; antes pasaba al desplazamiento nativo y la vista subía.

## Pendientes / ideas sueltas

- Probar con dispositivos reales: sala por internet, red local y conexión directa; sonido con parlante y micrófono; voz audible; heurística rueda vs. trackpad.
- Rotar las claves `service_role` y secret del proyecto Supabase `kyrozine` (quedaron en una conversación).
- Renombrar la organización de Supabase a "Kyro Zine Generator" (solo desde el panel) y mover los proyectos `dashboardBioMarketing` y `crm-peques`.
- Voz Fred auténtica: generar audios con `say -v Fred` en una Mac.
- Rediseño completo de la app para celular.
- Instalador sin firmar (SmartScreen avisa).
- Selección: la pluma es de segmentos rectos y hay una sola selección a la vez.
- Fotos acumuladas en el bucket de Supabase (1 GB gratis, sin limpieza).
- El historial del chat se pierde si la sala queda vacía y nadie lo guardó (solo persiste por navegador; en conexión directa no se guarda).
