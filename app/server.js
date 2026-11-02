const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
// node siempre en 3000; en Render nginx (externo o interno) escucha en $PORT
const port = process.env.NODE_PORT || 3000;

// Conexión solo por variables de entorno (sin credenciales en el código)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Render PostgreSQL exige TLS; en local (red interna) no aplica
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

const indexPath = path.join(__dirname, 'public', 'index.html');

async function dbTime() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() AS current_time');
    return result.rows[0].current_time;
  } finally {
    client.release();
  }
}

// Raíz: página docs con la hora de la BD incrustada (refresco en vivo con JS)
app.get('/', async (req, res) => {
  try {
    const html = fs.readFileSync(indexPath, 'utf8');
    const time = await dbTime().catch(() => null);
    res.send(html.replace('{{DB_TIME}}', time ? String(time) : 'unavailable'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno');
  }
});

// JSON en vivo que consume la sección Status del index.html
app.get('/api/status', async (req, res) => {
  const start = Date.now();
  try {
    const time = await dbTime();
    res.json({
      db: 'connected',
      serverTime: time,
      latencyMs: Date.now() - start,
      uptimeSec: Math.floor(process.uptime()),
      node: process.version,
    });
  } catch (err) {
    res.json({ db: 'disconnected', uptimeSec: Math.floor(process.uptime()) });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App corriendo internamente en puerto ${port}`);
});
