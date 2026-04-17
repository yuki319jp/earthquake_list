FROM node:22-alpine
WORKDIR /app

RUN corepack enable
COPY package.json ./
RUN pnpm install

COPY . .

EXPOSE 5173
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]
