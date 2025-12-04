# XenoFDE - Shopify Data Ingestion & Analytics Platform

A comprehensive multi-tenant platform for ingesting, storing, and analyzing Shopify store data with real-time synchronization and advanced analytics dashboard.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Known Limitations & Assumptions](#known-limitations--assumptions)
- [Deployment](#deployment)

---

## ✨ Features

- 🔐 **Email-based Authentication** - Secure login and registration with JWT
- 🏪 **Multi-Tenant Support** - Isolated data for multiple Shopify stores using Prisma ORM
- 📊 **Real-time Analytics Dashboard** - Visualize customers, orders, revenue, and more
- 🔄 **Automatic Data Sync** - Scheduled synchronization (every 6 hours) + Webhook support
- 📈 **Advanced Metrics** - Revenue trends, top customers, product performance, conversion funnel
- 🎨 **Modern UI** - Built with Next.js and Tailwind CSS
- 🗄️ **Robust Database** - PostgreSQL with Prisma ORM for type-safe queries
- 🚀 **Production Ready** - Docker support and deployment configurations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Login/Reg  │  │  Dashboard   │  │  Analytics   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Express.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Auth API   │  │ Ingestion API│  │ Analytics API│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Shopify Service (API Client)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Scheduler (Cron Jobs)                        │   │
│  │         - Syncs data every 6 hours                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Webhook Handler                              │   │
│  │         - Real-time data sync from Shopify                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Tenants  │  │Customers │  │  Orders  │  │ Products  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐                                   │
│  │  Users   │  │  Events  │                                   │
│  └──────────┘  └──────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Shopify Admin API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Shopify Store                                 │
│              (External - Customer's Store)                      │
└─────────────────────────────────────────────────────────────────┘
```

### **Component Breakdown:**

1. **Frontend (Next.js)**
   - React-based dashboard with Tailwind CSS
   - Client-side authentication using JWT tokens
   - Real-time data visualization using Recharts
   - Responsive design for mobile and desktop

2. **Backend API (Express.js)**
   - RESTful API endpoints
   - JWT-based authentication middleware
   - Multi-tenant data isolation using Prisma ORM
   - Shopify API integration service
   - Scheduled data synchronization (Cron jobs)
   - Webhook handler for real-time updates

3. **Database (PostgreSQL)**
   - Relational database with Prisma ORM
   - Multi-tenant schema with tenant isolation
   - Indexed queries for performance

4. **External Services**
   - Shopify Admin API for data ingestion
   - Shopify Webhooks for real-time updates

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** (v20 or higher)
- **PostgreSQL** (v15 or higher)
- **npm** or **yarn**
- **Shopify Store** (development or production store)
- **Shopify Admin API Access Token**

### Step 1: Clone Repositories

```bash
# Backend
git clone https://github.com/Milind-Ranjan/xenofde-backend.git
cd xenofde-backend

# Frontend (in separate directory)
git clone https://github.com/Milind-Ranjan/xenofde-frontend.git
cd xenofde-frontend
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 3: Set Up Database

```bash
# Create PostgreSQL database
createdb xenofde

# Or using psql
psql -U postgres
CREATE DATABASE xenofde;
\q
```

### Step 4: Configure Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/xenofde?schema=public"
PORT=3001
JWT_SECRET=your-random-secret-key-change-this
NODE_ENV=development
SYNC_INTERVAL="0 */6 * * *"
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### Step 5: Run Database Migrations

```bash
cd backend
npm run db:generate
npm run db:migrate
```

### Step 6: Get Shopify Access Token

1. Go to your Shopify Admin Panel
2. Navigate to **Settings** → **Apps and sales channels** → **Develop apps**
3. Click **Create an app**
4. Configure Admin API scopes:
   - `read_customers`
   - `read_orders`
   - `read_products`
5. Install the app and copy the **Admin API access token** (starts with `shpat_`)

### Step 7: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 8: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

### Step 9: Register and Use

1. Open http://localhost:3000
2. Click **Register**
3. Fill in:
   - Store Name
   - Shop Domain: `yourstore.myshopify.com` (no `https://`)
   - Access Token: Your Shopify token
   - Email & Password
4. Click **Sync Data** to fetch data from Shopify

---

## 🔌 API Endpoints

### Authentication & Tenant Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/tenant/register` | Register new tenant/store | No |
| POST | `/api/tenant/login` | Login user | No |
| GET | `/api/tenant/me` | Get current tenant info | Yes |

### Data Ingestion

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/ingestion/sync/all` | Sync all data (customers, products, orders) | Yes |
| POST | `/api/ingestion/sync/customers` | Sync customers only | Yes |
| POST | `/api/ingestion/sync/products` | Sync products only | Yes |
| POST | `/api/ingestion/sync/orders` | Sync orders only | Yes |
| POST | `/api/ingestion/events` | Record custom event | Yes |

### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/overview` | Get dashboard overview metrics | Yes |
| GET | `/api/analytics/orders` | Get orders with filters | Yes |
| GET | `/api/analytics/customers/top` | Get top customers by spend | Yes |
| GET | `/api/analytics/revenue/trends` | Get revenue trends over time | Yes |
| GET | `/api/analytics/orders/status` | Get order status distribution | Yes |
| GET | `/api/analytics/products/top` | Get top products by sales | Yes |
| GET | `/api/analytics/customers/trends` | Get customer acquisition trends | Yes |
| GET | `/api/analytics/aov/trends` | Get average order value trends | Yes |
| GET | `/api/analytics/funnel` | Get conversion funnel metrics | Yes |

### Webhooks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/webhooks/shopify` | Receive Shopify webhooks | No (signature verified) |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check endpoint | No |

---

## 🗄️ Database Schema

### Models Overview

The database uses **Prisma ORM** with PostgreSQL. All models include tenant isolation for multi-tenancy support.

#### **Tenant**
Stores Shopify store information and credentials.

```prisma
model Tenant {
  id          String   @id @default(uuid())
  shopDomain  String   @unique  // e.g., "mystore.myshopify.com"
  accessToken String   // Shopify Admin API token
  name        String
  email       String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  users       User[]
  customers   Customer[]
  orders      Order[]
  products    Product[]
  events      Event[]
}
```

#### **User**
Dashboard users with email-based authentication.

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hashed with bcrypt
  name      String?
  tenantId  String?  // Links to tenant
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
}
```

#### **Customer**
Shopify customers synced from stores.

```prisma
model Customer {
  id              String   @id @default(uuid())
  tenantId        String
  shopifyId       String   // Shopify customer ID
  email           String?
  firstName       String?
  lastName        String?
  phone           String?
  totalSpent      Decimal  @default(0)
  ordersCount     Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  orders          Order[]
  
  @@unique([tenantId, shopifyId])
  @@index([tenantId])
}
```

#### **Product**
Shopify products synced from stores.

```prisma
model Product {
  id              String   @id @default(uuid())
  tenantId        String
  shopifyId       String   // Shopify product ID
  title           String
  handle          String?
  vendor          String?
  productType     String?
  status          String?
  price           Decimal?
  compareAtPrice  Decimal?
  inventoryQuantity Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  orderItems      OrderItem[]
  
  @@unique([tenantId, shopifyId])
  @@index([tenantId])
}
```

#### **Order**
Shopify orders with financial and fulfillment status.

```prisma
model Order {
  id              String   @id @default(uuid())
  tenantId        String
  shopifyId       String   // Shopify order ID
  orderNumber     String?
  email           String?
  financialStatus String?  // paid, pending, refunded, etc.
  fulfillmentStatus String? // fulfilled, partial, unfulfilled
  totalPrice      Decimal
  subtotalPrice   Decimal?
  totalTax        Decimal?
  totalDiscounts  Decimal?
  currency        String?  @default("USD")
  customerId      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  items           OrderItem[]
  
  @@unique([tenantId, shopifyId])
  @@index([tenantId])
  @@index([customerId])
  @@index([shopifyCreatedAt])
}
```

#### **OrderItem**
Individual items within orders.

```prisma
model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  productId       String?
  shopifyProductId String?
  title           String
  quantity        Int
  price           Decimal
  totalDiscount   Decimal?
  sku             String?
  variantTitle    String?
  createdAt       DateTime @default(now())
  
  order           Order    @relation(fields: [orderId], references: [id])
  product         Product? @relation(fields: [productId], references: [id])
  
  @@index([orderId])
  @@index([productId])
}
```

#### **Event**
Custom events (cart abandoned, checkout started, etc.).

```prisma
model Event {
  id              String   @id @default(uuid())
  tenantId        String
  eventType       String   // "cart_abandoned", "checkout_started", etc.
  customerId      String?
  orderId         String?
  metadata        String?  @db.Text // JSON string
  createdAt       DateTime @default(now())
  
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([eventType])
  @@index([createdAt])
}
```

### Relationships

- **Tenant** → has many **Users**, **Customers**, **Orders**, **Products**, **Events**
- **User** → belongs to one **Tenant** (optional)
- **Customer** → belongs to one **Tenant**, has many **Orders**
- **Order** → belongs to one **Tenant**, belongs to one **Customer** (optional), has many **OrderItems**
- **Product** → belongs to one **Tenant**, has many **OrderItems**
- **OrderItem** → belongs to one **Order**, belongs to one **Product** (optional)
- **Event** → belongs to one **Tenant**

### Multi-Tenancy

All data models include `tenantId` field for data isolation. Prisma queries automatically filter by tenant using middleware, ensuring complete data separation between stores.

---

## ⚠️ Known Limitations & Assumptions

### Limitations

1. **Single User per Tenant**
   - Currently supports one user account per Shopify store
   - Multi-user support per tenant can be added in future

2. **Currency Support**
   - Defaults to USD
   - Multi-currency support not fully implemented

3. **Product Variants**
   - Uses first variant for pricing
   - Full variant support can be added

4. **Rate Limiting**
   - No rate limiting on API endpoints
   - Shopify API rate limits handled gracefully but not queued

5. **Webhook Reliability**
   - Webhooks may fail due to network issues
   - Scheduled sync (every 6 hours) acts as backup
   - No retry mechanism for failed webhooks

6. **Data Retention**
   - No automatic data cleanup
   - Historical data accumulates indefinitely

7. **Authentication**
   - JWT tokens stored in localStorage (not httpOnly cookies)
   - Tokens expire after 7 days
   - No refresh token mechanism

### Assumptions

1. **Shopify Store Setup**
   - User has access to Shopify development or production store
   - User can generate Admin API access tokens
   - Store has existing data for testing

2. **Database**
   - PostgreSQL is available (local or cloud-hosted)
   - Database can handle concurrent connections
   - Sufficient storage for historical data

3. **Deployment**
   - Application deployed on platform supporting Node.js
   - Environment variables can be securely configured
   - HTTPS/SSL available in production

4. **Data Sync**
   - Initial sync pulls all historical data
   - Scheduled sync runs every 6 hours (configurable)
   - Webhooks provide real-time updates when configured

5. **Multi-Tenancy**
   - Each tenant = one Shopify store
   - Tenant data is completely isolated
   - One user account per tenant initially

6. **Data Model**
   - Shopify IDs stored as strings (handles large numbers)
   - Product variants simplified (first variant used)
   - Order items linked to products when available

---

## 🚀 Deployment

### Quick Deploy to Railway

1. **Push code to GitHub** (separate repos for backend/frontend)

2. **Deploy Backend:**
   - Railway → New Project → Deploy from GitHub
   - Select `xenofde-backend` repository
   - Add PostgreSQL database
   - Set environment variables (see Setup Instructions)
   - Generate domain

3. **Deploy Frontend:**
   - Railway → New → Deploy from GitHub
   - Select `xenofde-frontend` repository
   - Set `NEXT_PUBLIC_API_URL` = your backend URL
   - Generate domain

### Environment Variables for Production

**Backend:**
```
DATABASE_URL=<from PostgreSQL service>
PORT=3001
NODE_ENV=production
JWT_SECRET=<strong random string>
SYNC_INTERVAL="0 */6 * * *"
FRONTEND_URL=<your frontend URL>
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=<your backend URL>
NODE_ENV=production
```

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT, bcrypt
- **Scheduling:** node-cron
- **Charts:** Recharts
- **Deployment:** Docker, Railway/Render/Heroku ready

---

**Built with ❤️ for Shopify store analytics**
