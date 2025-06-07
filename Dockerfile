FROM node:23-slim
LABEL maintainer="Roël Couwenberg <contact@roelc.me>"
LABEL org.opencontainers.image.title="Authentication Proxy"
LABEL org.opencontainers.image.description="A Dockerised reverse authentication proxy for Visual Studio Code, meant to be stateless and run in a container."
LABEL org.opencontainers.image.url="https://roelc.me/en/resources/2024/06/14/authentication-proxy"
LABEL org.opencontainers.image.source="https://github.com/pixnyb/authentication-proxy"

RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm install --omit=dev

COPY . /app

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "index.js"]

HEALTHCHECK --interval=5s --timeout=5s --start-period=1s --retries=15 CMD curl -f http://localhost:3000/healthz || exit 1

EXPOSE 3000
