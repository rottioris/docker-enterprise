# docker-enterprise

Three-tier web application orchestrated with Docker Compose: Nginx reverse
proxy → Node.js/Express API → PostgreSQL, isolated on a private bridge
network with a persistent volume.

## Stack

| Component | Version | Role |
|-----------|---------|------|
| Docker / Compose | 29.x / 5.x | Orchestration |
| Nginx | alpine | Reverse proxy (port 80) |
| Node.js + Express | 20 / ^4.18 | Application tier |
| PostgreSQL | 15-alpine | Data tier (volume `db_data`) |

## Run locally

```bash
cp .env.example .env      # set your DB credentials
docker compose up -d --build
open http://localhost
```

Credentials are read from `.env` (ignored by git). Never commit `.env`.

## Deploy on Render

Pushed to `main` → Render deploys automatically using `render.yaml`
(Docker web service + managed PostgreSQL, free plan). Environment variables
are wired from the database automatically.

## Architecture

```
browser ──▶ nginx:80 ──▶ app:3000 ──▶ postgres:5432 ──▶ db_data
                 └────── red_empresa (bridge, internal only) ──────┘
```

Only `web` publishes a host port. The app and database are reachable
exclusively inside the network.

## Project structure

```
├── docker-compose.yml    # local orchestration
├── render.yaml           # Render blueprint (production)
├── .env.example          # credential template
├── nginx/default.conf    # local reverse proxy config
└── app/
    ├── Dockerfile        # node + nginx image
    ├── server.js         # Express API + /api/status
    ├── public/index.html # documentation-style UI
    ├── nginx-render.conf # proxy config used on Render
    └── entrypoint.sh     # starts node + nginx
```

## License

Educational project.
