FROM node:22-slim

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm install

COPY . /app

CMD ["node", "app.js"]

HEALTHCHECK --interval=5s --timeout=5s --start-period=1s --retries=15 CMD curl -f http://localhost:3000/healthz || exit 1

EXPOSE 80
