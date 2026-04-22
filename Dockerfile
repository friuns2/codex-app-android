FROM node:20-bookworm-slim AS builder

WORKDIR /src

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Install codex CLI
RUN npm install -g @openai/codex

# Install OfficeCLI (office file preview)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      BINARY="officecli-linux-arm64"; \
    else \
      BINARY="officecli-linux-x64"; \
    fi && \
    curl -fsSL "https://github.com/iOfficeAI/OfficeCLI/releases/latest/download/${BINARY}" -o /usr/local/bin/officecli && \
    chmod +x /usr/local/bin/officecli

# Install runtime dependencies
COPY --from=builder /src/package.json /src/pnpm-lock.yaml /app/
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=builder /src/dist /app/dist
COPY --from=builder /src/dist-cli /app/dist-cli

ENV NODE_ENV=production
ENV CODEX_HOME=/root/.codex

EXPOSE 5900

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist-cli/index.js", "--port", "5900", "--no-open", "--no-login", "--no-tunnel"]
