'use strict';
/* Le pone el icono propio y los datos de versión al .exe empaquetado.
   electron-builder lo haría con winCodeSign, pero esa herramienta necesita
   crear enlaces simbólicos (permiso de administrador en Windows), así que se
   hace directamente con rcedit. */
const path = require('path');
const mod = require('rcedit');
const rcedit = typeof mod === 'function' ? mod : (mod.rcedit || mod.default);

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exe = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe');
  await rcedit(exe, {
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    'version-string': {
      ProductName: 'Kyro Zine Generator',
      FileDescription: 'Kyro Zine Generator',
      CompanyName: 'Kyro',
      OriginalFilename: 'Kyro Zine Generator.exe',
    },
  });
  console.log('  • icono aplicado a', path.basename(exe));
};
