FROM node:22-alpine

ARG TARGETARCH

RUN apk add --no-cache coreutils

WORKDIR /workspace

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm install --ignore-scripts
RUN case "$TARGETARCH" in \
    arm64) canvas_package=@napi-rs/canvas-linux-arm64-musl@1.0.2 ;; \
    amd64) canvas_package=@napi-rs/canvas-linux-x64-musl@1.0.2 ;; \
    *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
  esac \
  && npm install --ignore-scripts --no-save "$canvas_package"

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:8000/ready').then(response => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npm", "run", "dev", "-w", "api"]
