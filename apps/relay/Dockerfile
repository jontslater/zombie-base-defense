FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/relay/package.json apps/relay/
RUN pnpm install --filter @zbd/relay...

FROM deps AS build
COPY apps/relay apps/relay
RUN pnpm --filter @zbd/relay build

FROM deps AS deploy
RUN pnpm deploy --filter @zbd/relay --prod --legacy /out

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
COPY --from=build /app/apps/relay/dist ./dist
COPY --from=deploy /out/package.json ./
COPY --from=deploy /out/node_modules ./node_modules
EXPOSE 8787
CMD ["node", "dist/server.js"]
