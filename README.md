# Visual WhatsApp Commerce SaaS Platform

Visual WhatsApp Commerce is a complete, multi-tenant SaaS platform allowing textile, lace, garment accessories, and fabric businesses to connect their Official Meta WhatsApp Business API account and enable customers to search through 50,000+ designs by sending images on WhatsApp.

---

## 🛠️ TECH STACK
* **Frontend**: Next.js 15, TypeScript, TailwindCSS, Recharts
* **Backend**: NestJS, TypeORM, PostgreSQL, Redis, BullMQ
* **Vector Search**: Qdrant Vector Engine
* **Storage**: S3-compatible cloud storage (Cloudflare R2 / AWS S3 / MinIO)
* **Onboarding**: Meta Embedded Sign-Up Flow + WhatsApp Business Cloud API

---

## 🚀 GETTING STARTED (DOCKER SETUP)

Ensure you have **Docker** and **Docker Compose** installed.

1. Clone or navigate to the workspace directory:
   ```bash
   cd c:\automationless
   ```

2. Start all services in detached mode:
   ```bash
   docker-compose up -d --build
   ```

3. Access dashboards:
   * **Merchant Web Dashboard**: [http://localhost:3002](http://localhost:3002)
   * **NestJS Backend REST API / Swagger**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
   * **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Credentials: `minio_admin` / `minio_password`)
   * **Qdrant Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

---

## 🔑 ENVIRONMENT CONFIGURATION (`backend/.env`)

Configure the following environment variables in your deployment production environment:

```env
PORT=4000
NODE_ENV=production

# Database Credentials
DB_HOST=postgres
DB_PORT=5432
DB_USER=vwc_user
DB_PASSWORD=vwc_password
DB_NAME=vwc_db

# Cache & Queues
REDIS_HOST=redis
REDIS_PORT=6379

# Vector Index
QDRANT_URL=http://qdrant:6333

# Storage (AWS S3 / Cloudflare R2 / MinIO)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=minio_password
S3_BUCKET=vwc-media
S3_PUBLIC_DOMAIN=http://localhost:9000

# Meta WhatsApp Configurations
JWT_SECRET=super_secret_jwt_key_for_production_12345
WHATSAPP_VERIFY_TOKEN=vwc_verify_token_secure
```

---

## 🤖 BOT FLOW & SIMILARITY RULE AUTOMATION

The platform interprets chatbot graphs built via the React Flow editor in the dashboard. When an image is received:
1. **Rule 1 (Similarity >= 90%)**: The system automatically replies with details, price, and catalog link for the top matched design.
2. **Rule 2 (Similarity 70% - 90%)**: The system replies with a list of the top 3 visually similar items.
3. **Rule 3 (Similarity < 70%)**: The bot replies requesting a clearer photo of the design.
4. **Rule 4 (No Results)**: Transfers the conversation from `BOT` status to `HUMAN` and alerts agents in the dashboard.

---

## 🗄️ DATABASE BACKUP STRATEGY

Create a cron job on your VPS to execute periodic relational and vector backups:

### PostgreSQL Backup
```bash
docker exec -t vwc-postgres pg_dump -U vwc_user vwc_db > /backups/vwc_db_$(date +%F).sql
```

### Qdrant Snapshot Backup
```bash
curl -X POST http://localhost:6333/collections/product_images/snapshots
```
Snapshots are saved under the `qdrant_data` volume mount location.
