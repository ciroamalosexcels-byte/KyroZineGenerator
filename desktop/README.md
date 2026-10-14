# Kyro Zine Generator · app de escritorio

Programa para Windows que abre la app en su propia ventana y levanta un
servidor en la red local. Quienes estén en la misma red (Wi‑Fi o cable) entran
desde el navegador con la dirección que muestra el panel **Colaborar**, y editan
el mismo proyecto en vivo. No necesita internet ni cuentas.

## Usarlo
- Ejecutá `Kyro-Zine-Generator.exe` (portable, no se instala).
- La primera vez, Windows pregunta si permitís el acceso a la red: aceptá en
  **redes privadas**.
- Abrí **Colaborar** (icono de personas) → **Crear sala**. Copiá el enlace
  (`http://192.168.x.x:3737/#sala=CODIGO`) y mandalo a quien esté en tu red.

## Armarlo
```
cd desktop
npm install
npm run dist      # genera dist/Kyro-Zine-Generator.exe
npm start         # abre la app sin empaquetar
npm run serve     # solo el servidor, sin ventana (usa Node)
```
`npm run prepare-app` copia `index.html` y `favicon.svg` a `desktop/app/`.

## Qué hace el servidor (`server.js`)
- Sirve `index.html` y `favicon.svg`.
- `WS /ws?room=CODIGO&id=ID`: reenvía los mensajes entre quienes están en la sala
  y mantiene la lista de presentes.
- `PUT|GET /asset/rooms/CODIGO/<sha1>.<ext>`: guarda en memoria las imágenes de
  la sala (máx. 30 MB cada una, 600 MB en total) mientras el programa está abierto.
- `GET /lan-info`: direcciones de la red para compartir.
- No guarda proyectos: cada persona guarda el suyo (`.kyro`).
