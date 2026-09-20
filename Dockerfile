# Build stage for React / Vite frontend
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production runtime stage
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3500
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Copy server files and install production dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/src ./src

# Copy built frontend assets
COPY --from=client-builder /app/client/dist /app/client/dist

# Create persistent data directory
RUN mkdir -p /app/data/uploads

WORKDIR /app

EXPOSE 3500

VOLUME ["/app/data"]

CMD ["node", "server/src/index.js"]
