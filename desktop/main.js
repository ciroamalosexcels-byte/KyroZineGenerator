'use strict';
/* Kyro Zine Generator · app de escritorio
   Abre una ventana con la app y levanta, en segundo plano, el servidor de la
   red local (server.js): quienes estén en la misma red entran con la
   dirección que figura en el panel "Colaborar". */
const { app, BrowserWindow, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { createServer } = require('./server');

const root = fs.existsSync(path.join(__dirname, 'app', 'index.html')) ? path.join(__dirname, 'app') : path.join(__dirname, '..');
let server = null;
let win = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
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
    win.loadURL('http://127.0.0.1:' + server.port + '/');
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
