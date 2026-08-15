FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]