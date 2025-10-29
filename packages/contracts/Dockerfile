# Dockerfile for Smart Contracts
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/contracts ./packages/contracts
COPY tsconfig.json ./

# Build contracts
WORKDIR /app/packages/contracts
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/contracts/dist ./dist
COPY --from=builder /app/packages/contracts/artifacts ./artifacts
COPY --from=builder /app/packages/contracts/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

EXPOSE 8545

CMD ["node", "dist/index.js"]
