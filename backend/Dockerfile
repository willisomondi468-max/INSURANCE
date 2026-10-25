# Backend Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source
COPY src ./src
COPY .env.example ./.env.example

# Create uploads directory
RUN mkdir -p uploads && touch uploads/.gitkeep

# Use non-root user
USER node

EXPOSE 5000

CMD ["node", "src/index.js"]