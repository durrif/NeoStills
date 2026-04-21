# NeoStills v2 — Production Deployment Guide

## Architecture
```
Internet → Nginx (host/CT100) → :8080 (frontend container)
                              → /api/ → :8001 (backend container)
```

## CT/VMs
- Old NeoStills (production): CT 101 — port 8000
- New NeoStills v2 (this): CT 102 — frontend :8080, backend :8001

## First-time setup

```bash
# 1. Clone / copy to CT 102
cd /opt/neostills/simple-backend/neostills-v2

# 2. Create .env from example
cp .env.production.example .env
# Edit .env with real secrets (openssl rand -hex 32 for SECRET_KEY)
nano .env

# 3. Build and start
docker compose -f docker-compose.production.yml up -d --build

# 4. Run database migrations
docker compose -f docker-compose.production.yml exec backend alembic upgrade head

# 5. Create admin user (first user)
docker compose -f docker-compose.production.yml exec backend python scripts/seed_data.py

# 6. (Optional) Migrate legacy data from old neostills
docker compose -f docker-compose.production.yml exec backend \
  python scripts/migrate_json_to_db.py \
  --json-dir /legacy/data \
  --brewery-id 1
```

## External Nginx proxy config (on host/CT100)

```nginx
server {
    server_name neostills.com www.neostills.com;
    listen 443 ssl http2;

    # SSL certs (Let's Encrypt via certbot)
    ssl_certificate /etc/letsencrypt/live/neostills.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neostills.com/privkey.pem;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        # SSE streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 120s;
    }

    # iSpindel webhook (no auth needed, secured by HMAC)
    location /api/v1/fermentation/ispindel/webhook {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket (brewing + fermentation live)
    location ~ ^/api/v1/(brewing|fermentation)/[0-9]+/ws$ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # SPA frontend
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

## Updating

```bash
cd /opt/neostills/simple-backend/neostills-v2
git pull
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec backend alembic upgrade head
```

## Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Backend only
docker compose -f docker-compose.production.yml logs -f backend

# Worker
docker compose -f docker-compose.production.yml logs -f worker
```

## Backup database

```bash
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U neostills neostills | gzip > /backup/neostills-$(date +%Y%m%d).sql.gz
```
