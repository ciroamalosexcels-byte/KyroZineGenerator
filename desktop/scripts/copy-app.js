'use strict';
/* Copia la app web (index.html y favicon.svg) a desktop/app/ para que viaje
   dentro del programa empaquetado. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const out = path.join(__dirname, '..', 'app');
fs.mkdirSync(out, { recursive: true });
['index.html', 'favicon.svg'].forEach((f) => {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
  console.log('copiado', f);
});
