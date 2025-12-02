# XenoFDE Backend - Data Ingestion & Analytics API

Backend API service for Shopify data ingestion and analytics platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Shopify Admin API Access Token

### Installation

```bash
npm install
npm run db:generate
npm run db:migrate
```

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/xenofde?schema=public"
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
SYNC_INTERVAL="0 */6 * * *"
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📚 API Endpoints

### Authentication
- `POST /api/tenant/register` - Register new tenant
- `POST /api/tenant/login` - Login
- `GET /api/tenant/me` - Get current tenant

### Data Ingestion
- `POST /api/ingestion/sync/all` - Sync all data
- `POST /api/ingestion/sync/customers` - Sync customers
- `POST /api/ingestion/sync/products` - Sync products
- `POST /api/ingestion/sync/orders` - Sync orders

### Analytics
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/orders` - Get orders
- `GET /api/analytics/customers/top` - Top customers
- `GET /api/analytics/revenue/trends` - Revenue trends
- `GET /api/analytics/products/top` - Top products
- `GET /api/analytics/customers/trends` - Customer trends
- `GET /api/analytics/aov/trends` - AOV trends
- `GET /api/analytics/funnel` - Conversion funnel

### Webhooks
- `POST /api/webhooks/shopify` - Shopify webhook endpoint

## 🗄️ Database

Uses Prisma ORM with PostgreSQL. Run migrations:

```bash
npm run db:migrate
```

## 🔗 Related

- Frontend: https://github.com/YOUR_USERNAME/xenofde-frontend
- Documentation: See main project README

## 📄 License

ISC

