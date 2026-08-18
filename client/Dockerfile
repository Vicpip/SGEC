# ── Frontend — React + Vite → build estático servido por Nginx ───────────

# Etapa 1: build
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: servir con Nginx
FROM nginx:alpine

# Copiar build de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx para React Router (SPA)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
