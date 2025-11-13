import grpc from '@grpc/grpc-js';

class WhatsAppService {
  constructor(baileysService) {
    this.baileysService = baileysService;
    this.messageQueue = new Map(); // Para tracking de mensajes
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  async SendMessage(call, callback) {
    try {
      const { numero, codigo_pais, mensaje, message_id, type } = call.request;
      
      console.log(`gRPC SendMessage request:`, {
        numero,
        codigo_pais,
        mensaje: mensaje.substring(0, 50) + '...',
        message_id,
        type
      });

      // Validaciones básicas
      if (!numero || !codigo_pais || !mensaje) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Los campos numero, codigo_pais y mensaje son requeridos'
        });
      }

      // Generar ID único si no se proporciona
      const msgId = message_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Formatear número completo
      const fullNumber = `${codigo_pais}${numero}`;
      const jid = `${fullNumber}@s.whatsapp.net`;

      // Verificar si Baileys está conectado
      if (!this.baileysService || !this.baileysService._sock || this.baileysService._connectionState !== 'open') {
        return callback(null, {
          success: false,
          message: 'WhatsApp no está conectado',
          message_id: msgId,
          timestamp: Date.now()
        });
      }

      // Enviar mensaje usando Baileys
      await this.baileysService.sendMessage(numero, codigo_pais, mensaje);

      // Guardar en queue para tracking
      this.messageQueue.set(msgId, {
        timestamp: Date.now(),
        status: 'SENT'
      });

      const response = {
        success: true,
        message: 'Mensaje enviado exitosamente',
        message_id: msgId,
        timestamp: Date.now(),
      };

      console.log(`Message sent successfully:`, response);
      callback(null, response);

    } catch (error) {
      console.error('Error sending message via gRPC:', error);
      
      const msgId = call.request.message_id || `msg_${Date.now()}_error`;
      callback(null, {
        success: false,
        message: `Error al enviar mensaje: ${error.message}`,
        message_id: msgId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Obtiene el estado de un mensaje
   */
  GetMessageStatus(call, callback) {
    try {
      const { message_id } = call.request;

      if (!message_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Se requiere message_id'
        });
      }

      // Buscar en la queue local
      let messageInfo = null;
      if (message_id) {
        messageInfo = this.messageQueue.get(message_id);
      } 

      if (!messageInfo) {
        return callback(null, {
          message_id: message_id || '',
          status: 0, // UNKNOWN
          timestamp: Date.now(),
          details: 'Mensaje no encontrado'
        });
      }

      // Mapear estado a enum
      const statusMap = {
        'PENDING': 1,
        'SENT': 2,
        'DELIVERED': 3,
        'READ': 4,
        'FAILED': 5
      };

      const response = {
        message_id: message_id || '',
        status: statusMap[messageInfo.status] || 0,
        timestamp: messageInfo.timestamp,
        details: `Estado: ${messageInfo.status}`
      };

      callback(null, response);

    } catch (error) {
      console.error('Error getting message status:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: `Error al obtener estado: ${error.message}`
      });
    }
  }

}

export default WhatsAppService;