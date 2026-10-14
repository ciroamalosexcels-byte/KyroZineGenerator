# Ideas KyroZine

Orden sugerido (de menor a mayor esfuerzo):

1. [x] Exportar una hoja sola (botón de descarga en la vista previa, modo Hojas)
2. [x] Más resolución: escenario nítido con el zoom, diálogo de exportación (Borrador / Para imprimir / Máxima calidad), importaciones sin recomprimir de más, muestreo del pincel
3. [x] Bloquear capas (candado en cada capa del panel)
4. [x] Importar PDF de varias páginas (Ajustes → Importar PDF…): páginas o imágenes sueltas, y a qué hoja va cada una
5. [x] Herramientas de selección (S): marco, círculo, lazo y pluma; copiar/cortar/pegar, borrar, recortar fuera, pasar a capa nueva, mover trazos, pintar solo dentro
6. [x] Mesa de trabajo multiplayer: salas en vivo (internet con Supabase, red local con la app de escritorio, conexión directa con QR), chat, código por sonido, perfil con icono y color
7. [x] Modo voz robótica (Ajustes → activar): al pasar el mouse (hover) por una herramienta, una voz sintetizada de estilo "Fitter Happier" (Radiohead) dice su nombre. Investigar: `speechSynthesis` del navegador (voces disponibles según el sistema), tono/velocidad bajos para el efecto robótico; no se puede usar la voz original del tema.
8. [x] Modo LAN (carpeta desktop/): al abrir el programa compilado (versión de escritorio), se levanta un servidor en la red local y otras personas de la misma red editan el mismo proyecto, sin internet ni cuentas. Requiere empaquetar la app (Electron o Tauri) con un servidor WebSocket local; reutiliza el protocolo de la sala en vivo (mensajes por página + imágenes por hash), cambiando Supabase por ese servidor.
