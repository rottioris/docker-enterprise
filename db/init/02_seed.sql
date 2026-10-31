INSERT INTO clientes (nombre, email) VALUES
  ('Ana Torres',   'ana@example.com'),
  ('Luis Ramírez', 'luis@example.com'),
  ('Marta Díaz',   'marta@example.com')
ON CONFLICT (email) DO NOTHING;
