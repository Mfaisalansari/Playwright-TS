/**
 * QA Demo App - a small, dependency-free test application for the framework's sample tests.
 *   node demo-app/server.js          (port 4000, or PORT env var)
 * Pages: /login.html /dashboard.html /forms.html /alerts.html /frames.html /windows.html
 *        /table.html /interactions.html /waits.html /browser.html /downloads.html
 * REST API: /api/users (CRUD), /api/login, /api/secure (Bearer), /api/basic (Basic auth),
 *           /api/slow?ms=, /api/upload (multipart), /health
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const PUBLIC = path.join(__dirname, 'public');
const TOKEN = 'demo-token-123';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const seedUsers = () => [
  { id: 1, name: 'Aisha Khan', email: 'aisha@demo.test', role: 'Underwriter', active: true },
  { id: 2, name: 'Ben Carter', email: 'ben@demo.test', role: 'Broker', active: true },
  { id: 3, name: 'Chen Li', email: 'chen@demo.test', role: 'Claims Handler', active: false },
];
let users = seedUsers();
let nextId = 4;

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isObj ? 'application/json' : 'text/plain', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function parseJson(buf) {
  try { return buf.length ? JSON.parse(buf.toString()) : {}; } catch { return null; }
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','users','1']
  const method = req.method;

  if (url.pathname === '/api/reset' && method === 'POST') { users = seedUsers(); nextId = 4; return send(res, 200, { reset: true }); }

  if (url.pathname === '/api/login' && method === 'POST') {
    const b = parseJson(await readBody(req)) || {};
    if (b.username === 'admin' && b.password === 'Admin@123') return send(res, 200, { token: TOKEN, user: 'admin' }, { 'Set-Cookie': 'session=active; Path=/' });
    return send(res, 401, { error: 'Invalid username or password' });
  }

  if (url.pathname === '/api/secure') {
    return req.headers.authorization === `Bearer ${TOKEN}` ? send(res, 200, { secret: 'classified' }) : send(res, 401, { error: 'Unauthorized' });
  }

  if (url.pathname === '/api/basic') {
    const expected = 'Basic ' + Buffer.from('admin:Admin@123').toString('base64');
    return req.headers.authorization === expected ? send(res, 200, { auth: 'basic-ok' }) : send(res, 401, { error: 'Unauthorized' });
  }

  if (url.pathname === '/api/slow') {
    const ms = Math.min(Number(url.searchParams.get('ms') || 1500), 10000);
    return setTimeout(() => send(res, 200, { waited: ms }), ms);
  }

  if (url.pathname === '/api/upload' && method === 'POST') {
    const body = (await readBody(req)).toString('latin1');
    const m = /filename="([^"]+)"/.exec(body);
    return send(res, 200, { received: !!m, filename: m ? m[1] : null, bytes: body.length });
  }

  if (parts[1] === 'users') {
    const id = parts[2] ? Number(parts[2]) : undefined;
    const user = id ? users.find((u) => u.id === id) : undefined;
    if (method === 'GET' && !id) {
      const role = url.searchParams.get('role');
      return send(res, 200, role ? users.filter((u) => u.role === role) : users);
    }
    if (method === 'GET') return user ? send(res, 200, user) : send(res, 404, { error: 'Not found' });
    if (method === 'POST') {
      const b = parseJson(await readBody(req));
      if (!b || !b.name || !b.email) return send(res, 400, { error: 'name and email are required' });
      const created = { id: nextId++, active: true, role: 'Broker', ...b };
      users.push(created);
      return send(res, 201, created);
    }
    if (!user) return send(res, 404, { error: 'Not found' });
    if (method === 'PUT' || method === 'PATCH') {
      const b = parseJson(await readBody(req)) || {};
      Object.assign(user, method === 'PUT' ? { name: '', email: '', role: '', ...b, id } : b);
      return send(res, 200, user);
    }
    if (method === 'DELETE') {
      users = users.filter((u) => u.id !== id);
      return send(res, 200, { deleted: id });
    }
  }
  return send(res, 404, { error: 'Unknown endpoint' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/health') return send(res, 200, 'ok');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);

  if (url.pathname === '/download/report.csv') {
    return send(res, 200, 'PolicyNo,Insured,Premium\nPOL-1001,Acme Ltd,1200.50\nPOL-1002,Globex,980.00\n', {
      'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="report.csv"',
    });
  }
  if (url.pathname === '/download/notes.txt') {
    return send(res, 200, 'Sample download notes', { 'Content-Disposition': 'attachment; filename="notes.txt"' });
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`QA Demo App running at http://localhost:${PORT}`));
