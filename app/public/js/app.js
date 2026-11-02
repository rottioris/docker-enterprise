const nodes = {
  web: document.getElementById('n-web'),
  app: document.getElementById('n-app'),
  db: document.getElementById('n-db'),
};
const links = [document.getElementById('l-web'), document.getElementById('l-app')];
const el = {
  count: document.getElementById('count'),
  lat: document.getElementById('lat'),
  uptime: document.getElementById('uptime'),
};
const set = (node, cls) => { node.className = 'node ' + cls; };
const setWire = (link, state) => {
  link.classList.toggle('active', state === 'ok');
  link.classList.toggle('err', state === 'err');
};
let health = { app: false, db: false };
let traveling = false;

async function refresh() {
  if (traveling) return;

  let s = null;
  try {
    const res = await fetch('/api/status');
    s = await res.json();
  } catch (e) {
    s = null;
  }

  const app = s !== null;                 // la app respondió por HTTP
  const db = app && s.db === 'connected'; // la app alcanzó postgres
  health = { app, db };

  set(nodes.web, 'ok');
  set(nodes.app, app ? 'ok' : 'err');
  set(nodes.db, db ? 'ok' : 'err');

  setWire(links[0], app ? 'ok' : 'err');
  setWire(links[1], db ? 'ok' : 'err');

  el.count.textContent = `${1 + (app ? 1 : 0) + (db ? 1 : 0)}/3`;
  el.lat.textContent = app ? s.latencyMs : '—';
  const u = (app && s.uptimeSec) || 0;
  el.uptime.textContent = u < 60 ? u + 's' : Math.floor(u / 60) + 'm';
}

const btn = document.getElementById('btn');
const meta = document.getElementById('meta');
const out = document.getElementById('out');
const host = document.getElementById('host');
const hostlink = document.getElementById('hostlink');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const fecha = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });

function rows(data) {
  return data.map((c, i) => `
    <div class="row">
      <span class="rid" title="id ${c.id}">#${i + 1}</span>
      <span class="rname">${esc(c.nombre)}</span>
      <span class="rmail">${esc(c.email)}</span>
      <span class="rdate">${fecha(c.creado_en)}</span>
    </div>`).join('');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_TRIP = 1500;
const STEP = 380;

const hop = (link, ok) => {
  link.classList.remove('hop');
  void link.offsetWidth;               // reinicia la animación del paquete
  setWire(link, ok ? 'ok' : 'err');
  if (ok) link.classList.add('hop');
};

async function consult() {
  if (traveling) return;
  traveling = true;
  btn.disabled = true;
  btn.textContent = 'Consultando…';
  meta.textContent = 'preparando…';
  out.classList.remove('show');
  links.forEach((l) => { l.classList.remove('active', 'err', 'hop'); });
  hostlink.classList.remove('hop');

  const start = performance.now();
  const pending = fetch('/api/clientes')
    .then(async (res) => ({ res, body: await res.json(), ms: Math.round(performance.now() - start) }))
    .catch((error) => ({ error }));

  try {
    /* navegador → nginx (el host publica el puerto 80) */
    host.classList.add('busy');
    void hostlink.offsetWidth;
    hostlink.classList.add('hop');
    nodes.web.classList.add('trip');
    meta.textContent = 'navegador → nginx…';
    await sleep(STEP);

    /* nginx → node */
    hop(links[0], health.app);
    if (health.app) nodes.app.classList.add('trip');
    meta.textContent = health.app ? 'nginx → node…' : 'nginx → node: sin conexión';
    await sleep(STEP);

    /* node → postgres */
    hop(links[1], health.db);
    if (health.db) nodes.db.classList.add('trip');
    meta.textContent = health.db ? 'node → postgres…' : 'node → postgres: sin conexión';
    await sleep(STEP);

    const { res, body: s, ms, error } = await pending;
    if (error) throw error;
    if (!res.ok) throw new Error(s.error || 'error');

    const rest = MIN_TRIP - (performance.now() - start);
    if (rest > 0) await sleep(rest);

    meta.textContent = `${s.count} registros · ${ms} ms`;
    out.innerHTML = rows(s.data);
  } catch (e) {
    const rest = MIN_TRIP - (performance.now() - start);
    if (rest > 0) await sleep(rest);
    meta.textContent = 'sin datos';
    out.innerHTML = `<div class="row"><span class="rmail">No se pudo consultar: ${esc(e.message)}</span></div>`;
  } finally {
    host.classList.remove('busy');
    hostlink.classList.remove('hop');
    links.forEach((l) => l.classList.remove('hop'));
    nodes.web.classList.remove('trip');
    nodes.app.classList.remove('trip');
    nodes.db.classList.remove('trip');
    out.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Consultar';
    traveling = false;
    refresh();
  }
}

const form = document.getElementById('form');
const nom = document.getElementById('nom');
const mail = document.getElementById('mail');
const add = document.getElementById('add');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (traveling) return;

  add.disabled = true;
  add.textContent = 'Agregando…';
  try {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nom.value.trim(), email: mail.value.trim() }),
    });
    const s = await res.json();
    if (!res.ok) throw new Error(s.error || 'error');

    form.reset();
    await consult();
  } catch (err) {
    meta.textContent = 'no se pudo agregar';
    out.innerHTML = `<div class="row"><span class="rmail">No se pudo agregar: ${esc(err.message)}</span></div>`;
    out.classList.add('show');
  } finally {
    add.disabled = false;
    add.textContent = 'Agregar';
  }
});

btn.addEventListener('click', consult);

refresh();
setInterval(refresh, 5000);
