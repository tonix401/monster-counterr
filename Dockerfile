# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - Caddy server
FROM caddy:2-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/caddy

# Caddy auto-serves from /usr/share/caddy on port 80
EXPOSE 80