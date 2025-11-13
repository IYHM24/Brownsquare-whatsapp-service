
# Usar una imagen base oficial de Node.js
FROM node:20.18.0-alpine3.19 AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias (git para dependencias por git, build tools)
RUN apk add --no-cache python3 make g++ git

# Copiar solo los ficheros de dependencias para aprovechar cache de docker
# (si en el futuro tienes package-lock.json podríamos usar `npm ci` en lugar de `npm install`)
COPY package.json ./

# Instalar dependencias dentro de la imagen (evita copiar node_modules desde el host)
RUN npm install

# Copiar el resto del código
COPY . .

# Comando por defecto
CMD ["npm", "run", "dev"]
