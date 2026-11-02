const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.NODE_PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

app.get('/api/status', async (req, res) => {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    res.json({
      db: 'connected',
      serverTime: result.rows[0].current_time,
      latencyMs: Date.now() - start,
      uptimeSec: Math.floor(process.uptime()),
      node: process.version,
    });
  } catch (err) {
    res.status(500).json({
      db: 'disconnected',
      error: err.message,
      uptimeSec: Math.floor(process.uptime()),
    });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, creado_en FROM clientes ORDER BY id LIMIT 50'
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, '0.0.0.0', () => {
  console.log(`Aplicación escuchando en el puerto ${port}`);
});
