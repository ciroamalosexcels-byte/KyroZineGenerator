'use strict';
/* Kyro Zine Generator · app de escritorio
   Abre una ventana con la app y levanta, en segundo plano, el servidor de la
   red local (server.js): quienes estén en la misma red entran con la
   dirección que figura en el panel "Colaborar".
   Doble clic en un .kyro: se abre en el programa (si ya está abierto, en la misma ventana). */
const { app, BrowserWindow, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { createServer } = require('./server');

const root = fs.existsSync(path.join(__dirname, 'app', 'index.html')) ? path.join(__dirname, 'app') : path.join(__dirname, '..');
let server = null;
let win = null;

// el .kyro que llegó al abrir el programa (doble clic en el archivo)
const kyroArg = (argv) => argv.slice(1).find((a) => /\.kyro$/i.test(a) && fs.existsSync(a));
function load(file) {
  if (!win || !server) return;
  if (file) server.abrir(path.resolve(file));
  win.loadURL('http://127.0.0.1:' + server.port + '/' + (file ? '?abrir=1' : ''));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (e, argv) => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    const file = kyroArg(argv);
    if (file) load(file);
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    try {
      server = await createServer({ port: 3737, root });
    } catch (err) {
      const { dialog } = require('electron');
      dialog.showErrorBox('Kyro Zine Generator', 'No pude abrir el servidor de la red local:\n' + err.message);
      app.quit();
      return;
    }
    win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      title: 'Kyro Zine Generator',
      backgroundColor: '#16130f',
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    load(kyroArg(process.argv));
    /* los enlaces externos se abren en el navegador, no dentro de la app */
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.on('closed', () => { win = null; });
  });

  app.on('window-all-closed', () => {
    if (server) server.close();
    app.quit();
  });
}
