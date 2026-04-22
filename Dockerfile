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
RUN pnpm install --frozen-lockfile && pnpm rebuild node-pty

COPY . .
RUN pnpm run build


FROM node:20-bookworm-slim

WORKDIR /app

# Common system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    wget \
    tini \
    jq \
    openssh-client \
    procps \
    libicu72 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Install mise (runtime version manager) + activate in shell
RUN curl -fsSL https://mise.run | sh && \
    ln -s /root/.local/bin/mise /usr/local/bin/mise && \
    echo 'eval "$(mise activate bash)"' >> /root/.bashrc && \
    echo 'export PATH="/root/.local/share/mise/shims:$PATH"' >> /root/.bashrc

# Make mise shims available in non-interactive shells (for codex subprocess)
ENV PATH="/root/.local/share/mise/shims:/root/.local/bin:${PATH}"

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

# Install runtime dependencies for node-pty
COPY --from=builder /src/package.json /src/pnpm-lock.yaml /app/
RUN pnpm install --prod --frozen-lockfile && pnpm rebuild node-pty

# Copy build artifacts
COPY --from=builder /src/dist /app/dist
COPY --from=builder /src/dist-cli /app/dist-cli

COPY entrypoint.sh /app/entrypoint.sh

ENV NODE_ENV=production
ENV CODEX_HOME=/root/.codex

EXPOSE 5900

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
CMD ["node", "dist-cli/index.js", "--port", "5900", "--no-open", "--no-login", "--no-tunnel"]
