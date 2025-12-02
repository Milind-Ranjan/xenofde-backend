# ===========================
# BUILD STAGE
# ===========================
FROM node:20-slim AS builder

WORKDIR /app

# Install system dependencies required by Prisma
RUN apt-get update && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dev dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build


# ===========================
# PRODUCTION STAGE
# ===========================
FROM node:20-slim

WORKDIR /app

# Install OpenSSL (required by Prisma on Debian)
RUN apt-get update && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose API port
EXPOSE 3001

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]