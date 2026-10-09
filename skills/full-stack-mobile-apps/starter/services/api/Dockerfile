FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci
COPY services/api/tsconfig.json services/api/tsconfig.json
COPY services/api/src services/api/src
RUN npm run api:build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/apps/mobile/package.json ./apps/mobile/package.json
RUN npm ci --omit=dev --workspace @__APP_SLUG__/api
COPY --from=build /app/services/api/dist ./services/api/dist
ENV PORT=3000
ENV DATABASE_PATH=/data/app.db
EXPOSE 3000
CMD ["node", "services/api/dist/index.js"]
