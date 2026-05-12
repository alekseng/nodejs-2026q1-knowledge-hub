FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p logs && chown node:node /app logs
USER node
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package*.json ./
COPY --chown=node:node --from=build /app/prisma ./prisma/
COPY --chown=node:node --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/src/main"]
