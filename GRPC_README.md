# gRPC WhatsApp Service

Este servicio WhatsApp incluye un servidor gRPC con dos servicios principales:

## 🏥 Health Service
Servicio para monitorear el estado del microservicio.

### Métodos disponibles:
- `Check(HealthCheckRequest) -> HealthCheckResponse`: Verifica el estado actual
- `Watch(HealthCheckRequest) -> stream HealthCheckResponse`: Stream de estado en tiempo real

## 📱 WhatsApp Service
Servicio para operaciones de WhatsApp.

### Métodos disponibles:
- `SendMessage(SendMessageRequest) -> SendMessageResponse`: Envía un mensaje
- `GetMessageStatus(MessageStatusRequest) -> MessageStatusResponse`: Obtiene el estado de un mensaje
- `SendBulkMessages(stream SendMessageRequest) -> stream SendMessageResponse`: Envío masivo

## 🚀 Configuración

### Variables de entorno:
```bash
# Puerto del servidor gRPC (opcional, default: 50051)
GRPC_PORT=50051

# Host del servidor gRPC (opcional, default: 0.0.0.0)
GRPC_HOST=0.0.0.0

# WhatsApp configuration
WA_PHONE=3506930989
WA_COUNTRY_CODE=57
```

### Iniciar el servicio:
```bash
npm start
# o
node src/server.js
```

## 📋 Archivos Proto

### health.proto
```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}
```

### whatsapp.proto
```protobuf
service WhatsAppService {
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse);
  rpc GetMessageStatus(MessageStatusRequest) returns (MessageStatusResponse);
  rpc SendBulkMessages(stream SendMessageRequest) returns (stream SendMessageResponse);
}
```

## 🔧 Uso del Cliente

### Ejemplo básico en Node.js:
```javascript
const GrpcClient = require('./src/grpc/client.example.js');

const client = new GrpcClient('localhost:50051');

// Verificar salud
const health = await client.checkHealth();
console.log(health);

// Enviar mensaje
const response = await client.sendMessage(
  '3001234567',    // numero
  '57',           // codigo_pais
  'Hola desde gRPC!' // mensaje
);
console.log(response);
```

### Usando grpcurl (herramienta CLI):
```bash
# Verificar salud
grpcurl -plaintext localhost:50051 health.Health/Check

# Enviar mensaje
grpcurl -plaintext -d '{
  "numero": "3001234567",
  "codigo_pais": "57", 
  "mensaje": "Hola desde grpcurl!"
}' localhost:50051 whatsapp.WhatsAppService/SendMessage
```

## 📊 Logs y Monitoreo

El servicio proporciona logs detallados:
- ✅ Inicio exitoso de servicios
- 📤 Envío de mensajes
- 🔍 Verificaciones de salud
- ❌ Errores y excepciones

### Estadísticas automáticas cada 60 segundos:
```
📊 Server Stats: {
  gRPC: 'Running',
  health: 'SERVING',
  messageQueue: 0,
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## 🛠️ Estructura de Archivos

```
src/
├── proto/
│   ├── health.proto          # Definición del servicio de salud
│   └── whatsapp.proto        # Definición del servicio WhatsApp
├── grpc/
│   ├── grpc.server.js        # Servidor gRPC principal
│   ├── health.service.js     # Implementación del servicio de salud  
│   ├── whatsapp.service.js   # Implementación del servicio WhatsApp
│   └── client.example.js     # Cliente de ejemplo
├── services/
│   └── Baileys/
│       └── Baileys.service.js # Servicio WhatsApp con Baileys
└── server.js                 # Servidor principal
```

## 🔄 Estados de Mensaje

Los mensajes pueden tener los siguientes estados:
- `UNKNOWN` (0): Estado desconocido
- `PENDING` (1): Pendiente de envío
- `SENT` (2): Enviado
- `DELIVERED` (3): Entregado
- `READ` (4): Leído
- `FAILED` (5): Falló el envío

## 🛡️ Estados de Salud

El servicio puede reportar los siguientes estados:
- `SERVING` (1): Funcionando normalmente
- `NOT_SERVING` (2): No disponible
- `SERVICE_UNKNOWN` (3): Servicio no existe

## 🔒 Shutdown Graceful

El servicio maneja adecuadamente las señales de cierre:
- `SIGTERM`, `SIGINT`, `SIGHUP`
- Cierra conexiones gRPC ordenadamente
- Termina conexiones de WhatsApp apropiadamente

## 🐛 Troubleshooting

### Error: "Proto file not found"
- Verificar que los archivos `.proto` estén en `src/proto/`
- Verificar permisos de lectura

### Error: "Address already in use"
- Cambiar `GRPC_PORT` en las variables de entorno
- Verificar que no haya otro servicio usando el puerto

### Error: "WhatsApp not connected"
- Verificar que Baileys esté conectado correctamente
- Revisar la configuración de WhatsApp

## 📞 Soporte

Para reportar problemas o sugerencias, por favor contacta al equipo de desarrollo.