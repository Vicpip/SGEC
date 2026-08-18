# ── Backend — Node.js + Express ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (mejor cache de Docker)
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear carpeta de uploads si no existe
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "server.js"]
