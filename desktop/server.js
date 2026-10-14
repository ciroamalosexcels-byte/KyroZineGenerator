'use strict';
/* Kyro Zine Generator · servidor de la red local (LAN)
   Sirve la app y hace de relé de la sala en vivo para quienes están en la
   misma red. No guarda proyectos: solo reenvía mensajes entre navegadores y
   guarda en memoria las imágenes de cada sala mientras el servidor está abierto.

   Protocolo (el mismo que usa la sala por internet):
     WS  /ws?room=CODIGO&id=ID   cliente -> {t:'track', meta} | {t:'bc', payload}
                                 servidor -> {t:'presence', peers} | {t:'bc', payload}
     PUT /asset/rooms/CODIGO/<sha1>.<ext>   guarda una imagen
     GET /asset/rooms/CODIGO/<sha1>.<ext>   la devuelve
     GET /lan-info                          {lan:true, port, urls:[...]}
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const dgram = require('dgram');
const { WebSocketServer } = require('ws');

const DISCOVERY_PORT = 3738;
const MAX_ASSET = 30 * 1024 * 1024;
const MAX_TOTAL = 600 * 1024 * 1024;
const ROOM_RE = /^[A-Z0-9]{4,12}$/;
const ASSET_RE = /^\/asset\/rooms\/([A-Z0-9]{4,12})\/([a-f0-9]{40})\.(jpg|png|webp|gif)$/;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/favicon.svg': 'favicon.svg' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml' };

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((n) => {
      if (n.family === 'IPv4' && !n.internal) out.push(n.address);
    });
  });
  return out;
}

/* Descubrimiento: cada programa anuncia por UDP (broadcast) su nombre, puerto y
   salas con gente, y escucha a los demás. Así la app puede mostrar qué
   servidores hay en la red sin que nadie escriba direcciones. */
function broadcastTargets() {
  const out = new Set(['255.255.255.255']);
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((n) => {
      if (n.family !== 'IPv4' || n.internal || !n.netmask) return;
      const a = n.address.split('.').map(Number);
      const m = n.netmask.split('.').map(Number);
      out.add(a.map((x, i) => (x | (~m[i] & 255))).join('.'));
    });
  });
  return [...out];
}

function startDiscovery(getInfo) {
  const id = crypto.randomBytes(6).toString('hex');
  const peers = new Map();
  let sock = null;
  try {
    sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.on('error', () => { /* sin red o puerto ocupado: la app sigue sin descubrimiento */ });
    sock.on('message', (msg, rinfo) => {
      let m;
      try { m = JSON.parse(String(msg)); } catch (e) { return; }
      if (!m || m.app !== 'kyro' || m.id === id || !Number.isInteger(m.port)) return;
      peers.set(m.id, {
        id: String(m.id).slice(0, 24),
        name: String(m.name || '').slice(0, 40),
        host: rinfo.address,
        port: m.port,
        rooms: (Array.isArray(m.rooms) ? m.rooms : []).filter((r) => ROOM_RE.test(r)).slice(0, 20),
        t: Date.now(),
      });
    });
    sock.bind(DISCOVERY_PORT, () => { try { sock.setBroadcast(true); } catch (e) { /* ignorar */ } });
  } catch (e) { sock = null; }
  const timer = setInterval(() => {
    const now = Date.now();
    peers.forEach((p, k) => { if (now - p.t > 7000) peers.delete(k); });
    if (!sock) return;
    const info = getInfo();
    if (!info.port) return;
    const payload = Buffer.from(JSON.stringify({ app: 'kyro', v: 1, id, name: os.hostname(), port: info.port, rooms: info.rooms }));
    broadcastTargets().forEach((addr) => {
      try { sock.send(payload, DISCOVERY_PORT, addr, () => {}); } catch (e) { /* ignorar */ }
    });
  }, 2000);
  timer.unref();
  return {
    list: () => [...peers.values()].map((p) => ({ id: p.id, name: p.name, host: p.host, port: p.port, rooms: p.rooms })),
    close: () => { clearInterval(timer); try { if (sock) sock.close(); } catch (e) { /* ignorar */ } },
  };
}

function cleanMeta(m) {
  m = m && typeof m === 'object' ? m : {};
  return {
    name: String(m.name || '').slice(0, 24),
    color: /^#[0-9a-fA-F]{3,8}$/.test(m.color || '') ? m.color : '#888888',
    page: Number.isInteger(m.page) && m.page >= 0 && m.page < 10000 ? m.page : 0,
  };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function createServer({ port = 3737, root }) {
  const rooms = new Map();   // code -> Map(id -> { ws, meta })
  const assets = new Map();  // 'CODE/hash.ext' -> Buffer
  let total = 0;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

    if (req.method === 'GET' && p === '/lan-peers') {
      const list = discovery ? discovery.list() : [];
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS));
      res.end(JSON.stringify({ peers: list.map((q) => Object.assign({ url: 'http://' + q.host + ':' + q.port + '/' }, q)) }));
      return;
    }

    if (req.method === 'GET' && p === '/lan-info') {
      const listening = server.address();
      const prt = listening && listening.port ? listening.port : port;
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS));
      res.end(JSON.stringify({ lan: true, port: prt, urls: lanAddresses().map((a) => 'http://' + a + ':' + prt + '/') }));
      return;
    }

    const am = ASSET_RE.exec(p);
    if (am) {
      const key = am[1] + '/' + am[2] + '.' + am[3];
      if (req.method === 'GET') {
        const buf = assets.get(key);
        if (!buf) { res.writeHead(404, CORS); res.end(); return; }
        res.writeHead(200, Object.assign({ 'Content-Type': MIME[am[3]], 'Cache-Control': 'public, max-age=31536000, immutable' }, CORS));
        res.end(buf);
        return;
      }
      if (req.method === 'PUT') {
        const chunks = [];
        let size = 0;
        let aborted = false;
        req.on('data', (c) => {
          size += c.length;
          if (size > MAX_ASSET) { aborted = true; res.writeHead(413, CORS); res.end(); req.destroy(); return; }
          chunks.push(c);
        });
        req.on('end', () => {
          if (aborted) return;
          if (!assets.has(key)) {
            if (total + size > MAX_TOTAL) { res.writeHead(507, CORS); res.end(); return; }
            assets.set(key, Buffer.concat(chunks));
            total += size;
          }
          res.writeHead(201, CORS);
          res.end();
        });
        return;
      }
      res.writeHead(405, CORS); res.end();
      return;
    }

    if (req.method === 'GET' && Object.prototype.hasOwnProperty.call(FILES, p)) {
      const file = path.join(root, FILES[p]);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('No encuentro ' + FILES[p]); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const discovery = startDiscovery(() => {
    const a = server.address();
    const busy = [];
    rooms.forEach((members, code) => { if (members.size > 0) busy.push(code); });
    return { port: a && a.port, rooms: busy.slice(0, 20) };
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });

  function broadcastPresence(code) {
    const room = rooms.get(code);
    if (!room) return;
    const peers = {};
    room.forEach((v, id) => { peers[id] = v.meta; });
    const msg = JSON.stringify({ t: 'presence', peers });
    room.forEach((v) => { if (v.ws.readyState === 1) v.ws.send(msg); });
  }

  function dropRoomAssets(code) {
    const prefix = code + '/';
    assets.forEach((buf, key) => {
      if (key.startsWith(prefix)) { total -= buf.length; assets.delete(key); }
    });
  }

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    const room = (url.searchParams.get('room') || '').toUpperCase();
    const id = url.searchParams.get('id') || '';
    if (url.pathname !== '/ws' || !ROOM_RE.test(room) || !id || id.length > 64) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      let members = rooms.get(room);
      if (!members) { members = new Map(); rooms.set(room, members); }
      const old = members.get(id);
      if (old) { try { old.ws.close(); } catch (e) { /* ya cerrado */ } }
      members.set(id, { ws, meta: cleanMeta({}) });
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      broadcastPresence(room);

      ws.on('message', (data) => {
        let m;
        try { m = JSON.parse(String(data)); } catch (e) { return; }
        if (m.t === 'track') {
          const me = members.get(id);
          if (me && me.ws === ws) { me.meta = cleanMeta(m.meta); broadcastPresence(room); }
        } else if (m.t === 'bc' && m.payload) {
          const out = JSON.stringify({ t: 'bc', payload: m.payload });
          members.forEach((v, other) => {
            if (other !== id && v.ws.readyState === 1) v.ws.send(out);
          });
        }
      });
      ws.on('close', () => {
        const me = members.get(id);
        if (me && me.ws === ws) members.delete(id);
        broadcastPresence(room);
        if (members.size === 0) {
          setTimeout(() => {
            const r = rooms.get(room);
            if (r && r.size === 0) { rooms.delete(room); dropRoomAssets(room); }
          }, 10 * 60 * 1000).unref();
        }
      });
    });
  });

  const beat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      try { ws.ping(); } catch (e) { /* ignorar */ }
    });
  }, 30000);
  beat.unref();

  return new Promise((resolve, reject) => {
    let tryPort = port;
    const attempt = () => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && tryPort < port + 20) { tryPort += 1; attempt(); } else reject(err);
      });
      server.listen(tryPort, '0.0.0.0', () => {
        resolve({
          port: server.address().port,
          urls: lanAddresses().map((a) => 'http://' + a + ':' + server.address().port + '/'),
          close: () => { clearInterval(beat); discovery.close(); wss.close(); server.close(); },
        });
      });
    };
    attempt();
  });
}

module.exports = { createServer, lanAddresses };

if (require.main === module) {
  const root = fs.existsSync(path.join(__dirname, 'app', 'index.html')) ? path.join(__dirname, 'app') : path.join(__dirname, '..');
  createServer({ port: Number(process.env.PORT) || 3737, root }).then((s) => {
    console.log('Kyro Zine Generator (LAN)');
    console.log('  En esta computadora: http://127.0.0.1:' + s.port + '/');
    s.urls.forEach((u) => console.log('  En tu red:           ' + u));
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
