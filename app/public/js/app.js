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
let traveling = false;

async function refresh() {
  if (traveling) return;
  try {
    const res = await fetch('/api/status');
    const s = await res.json();
    const ok = s.db === 'connected';

    set(nodes.web, 'ok');
    set(nodes.app, ok ? 'ok' : 'err');
    set(nodes.db, ok ? 'ok' : 'err');
    links.forEach(l => l.classList.toggle('active', ok));

    el.count.textContent = ok ? '3/3' : '1/3';
    el.lat.textContent = ok ? s.latencyMs : '—';
    const u = s.uptimeSec || 0;
    el.uptime.textContent = u < 60 ? u + 's' : Math.floor(u / 60) + 'm';
  } catch (e) {
    set(nodes.web, 'ok');
    set(nodes.app, 'err');
    set(nodes.db, 'err');
    links.forEach(l => l.classList.remove('active'));
    el.count.textContent = '1/3';
    el.lat.textContent = '—';
  }
}

const btn = document.getElementById('btn');
const meta = document.getElementById('meta');
const out = document.getElementById('out');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const fecha = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });

function rows(data) {
  return data.map((c) => `
    <div class="row">
      <span class="rid">#${c.id}</span>
      <span class="rname">${esc(c.nombre)}</span>
      <span class="rmail">${esc(c.email)}</span>
      <span class="rdate">${fecha(c.creado_en)}</span>
    </div>`).join('');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_TRIP = 1300;

async function consult() {
  if (traveling) return;
  traveling = true;
  btn.disabled = true;
  btn.textContent = 'Consultando…';
  meta.textContent = 'consultando…';
  out.classList.remove('show');
  links.forEach((l) => l.classList.remove('active'));

  const start = performance.now();
  const pending = fetch('/api/clientes')
    .then(async (res) => ({ res, body: await res.json(), ms: Math.round(performance.now() - start) }))
    .catch((error) => ({ error }));

  try {
    /* navegador → nginx */
    links[0].classList.add('active');
    nodes.web.classList.add('trip');
    await sleep(420);

    /* nginx → node */
    links[1].classList.add('active');
    nodes.app.classList.add('trip');
    await sleep(420);

    /* node → postgres */
    nodes.db.classList.add('trip');

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

btn.addEventListener('click', consult);

refresh();
setInterval(refresh, 5000);
