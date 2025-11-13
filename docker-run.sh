#!/bin/bash

# Script para construir y ejecutar el servicio WhatsApp con gRPC

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}Uso: $0 [COMANDO]${NC}"
    echo ""
    echo "Comandos disponibles:"
    echo -e "  ${GREEN}build${NC}       Construir la imagen Docker"
    echo -e "  ${GREEN}start${NC}       Iniciar el servicio"
    echo -e "  ${GREEN}stop${NC}        Detener el servicio"
    echo -e "  ${GREEN}restart${NC}     Reiniciar el servicio"
    echo -e "  ${GREEN}logs${NC}        Ver logs del servicio"
    echo -e "  ${GREEN}test${NC}        Ejecutar cliente de prueba"
    echo -e "  ${GREEN}clean${NC}       Limpiar imágenes y contenedores"
    echo -e "  ${GREEN}setup${NC}       Configuración inicial"
    echo ""
}

# Función para verificar Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker no está instalado${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose no está instalado${NC}"
        exit 1
    fi
}

# Función para setup inicial
setup() {
    echo -e "${BLUE}🔧 Configuración inicial...${NC}"
    
    # Crear .env si no existe
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  Archivo .env no encontrado, creando desde .env.example${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ Archivo .env creado. Por favor, edítalo con tus configuraciones.${NC}"
    fi
    
    # Crear directorio auth/auth_info si no existe
    if [ ! -d "auth/auth_info" ]; then
        echo -e "${YELLOW}📁 Creando directorio auth/auth_info...${NC}"
        mkdir -p auth/auth_info
        echo -e "${GREEN}✅ Directorio auth/auth_info creado${NC}"
    fi
    
    # Crear directorio logs si no existe
    if [ ! -d "logs" ]; then
        echo -e "${YELLOW}📁 Creando directorio logs...${NC}"
        mkdir -p logs
        echo -e "${GREEN}✅ Directorio logs creado${NC}"
    fi
    
    echo -e "${GREEN}✅ Configuración inicial completada${NC}"
}

# Función para construir
build() {
    echo -e "${BLUE}🔨 Construyendo imagen Docker...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✅ Imagen construida exitosamente${NC}"
}

# Función para iniciar
start() {
    echo -e "${BLUE}🚀 Iniciando servicio WhatsApp gRPC...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Servicio iniciado${NC}"
    echo -e "${YELLOW}📋 Para ver logs: $0 logs${NC}"
    echo -e "${YELLOW}🔧 Para probar: $0 test${NC}"
}

# Función para detener
stop() {
    echo -e "${BLUE}🛑 Deteniendo servicio...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Servicio detenido${NC}"
}

# Función para restart
restart() {
    echo -e "${BLUE}🔄 Reiniciando servicio...${NC}"
    docker-compose down
    docker-compose up -d
    echo -e "${GREEN}✅ Servicio reiniciado${NC}"
}

# Función para ver logs
logs() {
    echo -e "${BLUE}📋 Mostrando logs...${NC}"
    docker-compose logs -f whatsapp-grpc-service
}

# Función para test
test() {
    echo -e "${BLUE}🧪 Ejecutando cliente de prueba...${NC}"
    docker-compose --profile testing run --rm grpc-client-test node test-grpc-client.js
}

# Función para limpiar
clean() {
    echo -e "${BLUE}🧹 Limpiando contenedores e imágenes...${NC}"
    docker-compose down --rmi all --volumes --remove-orphans
    docker system prune -f
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Verificar Docker
check_docker

# Procesar comando
case "$1" in
    build)
        build
        ;;
    start)
        setup
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    test)
        test
        ;;
    clean)
        clean
        ;;
    setup)
        setup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Comando no reconocido: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac