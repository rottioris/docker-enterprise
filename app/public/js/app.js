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

async function refresh() {
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

refresh();
setInterval(refresh, 5000);
