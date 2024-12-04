FROM node:22-bookworm AS builder
COPY . /app
WORKDIR /app

RUN npm ci
ENV NODE_ENV=production

RUN npm run build && npm prune --production

FROM node:22-alpine
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app
COPY --from=builder /app/src/public /app/public
WORKDIR /app

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node","server.js"]
