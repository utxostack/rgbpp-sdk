FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack use pnpm@latest
RUN apt-get update -y && apt-get install -y ca-certificates

COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN npm pkg delete scripts.prepare 
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base AS service
COPY --from=prod-deps /app/node_modules /node_modules
COPY --from=build /app/apps /app/apps
COPY --from=build /app/packages /app/packages

WORKDIR /app/apps/service
RUN pnpm add @nestjs/cli -D
EXPOSE 3000
CMD [ "pnpm", "start" ]
