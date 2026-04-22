# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Remove development dependencies to keep production node_modules lean
RUN npm prune --production

# Stage 2: Production Runtime
# Using plain alpine instead of node:alpine saves ~80-100MB 
# because it doesn't include npm, yarn, and other build tools.
FROM alpine:3.19

WORKDIR /app

# Install ONLY the nodejs runtime (no npm/yarn)
RUN apk add --no-cache nodejs

# Copy pruned node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled output from builder
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Create the node user (plain alpine doesn't have it)
RUN addgroup -S node && adduser -S node -G node
USER node

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["/usr/bin/node", "dist/server.js"]