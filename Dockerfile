
# Usar una imagen base oficial de Node.js con soporte completo
FROM node:20.18.0-alpine AS base

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
# - python3, make, g++ para compilar dependencias nativas
# - git para dependencias desde repositorios git
# - cairo, pango, jpeg, giflib para procesamiento de imágenes (QR codes)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copiar archivos de dependencias para aprovechar cache de Docker
COPY package.json ./

# Instalar dependencias usando npm
RUN npm install --only=production

# Copiar el código fuente
COPY src/ ./src/

# Crear directorio auth (será reemplazado por bind volume)
RUN mkdir -p ./auth/auth_info

# Copiar archivos de configuración si existen
COPY .env* ./

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Cambiar permisos de los directorios necesarios
RUN chown -R nextjs:nodejs /app

# Cambiar al usuario no-root
USER nextjs

# Exponer el puerto gRPC (configurable via ENV)
EXPOSE 50051

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV GRPC_PORT=50051
ENV GRPC_HOST=0.0.0.0

# Comando por defecto
CMD ["npm", "run", "dev"]
