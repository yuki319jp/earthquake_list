FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable
COPY package.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app

RUN corepack enable
COPY package.json ./
RUN pnpm install --prod

COPY --from=build /app/dist ./dist

EXPOSE 8787
CMD ["node", "dist/server.js"]
