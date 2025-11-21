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

  /**
   * Obtiene el estado actual de la conexión con WhatsApp
   */
  GetConnectionStatus(call, callback) {
    try {
      const connectionState = this.baileysService?._connectionState || 'close';
      const sock = this.baileysService?._sock;

      // Mapear estado de Baileys a enum de proto
      const stateMap = {
        'open': 2,        // CONNECTED
        'connecting': 1,  // CONNECTING
        'close': 0,       // DISCONNECTED
      };

      const protoState = stateMap[connectionState] || 0;
      
      // Obtener información adicional
      const info = {
        phone_number: process.env.WA_COUNTRY_CODE + process.env.WA_PHONE || '',
        device_name: 'Baileys Service',
        is_authenticated: connectionState === 'open',
        connected_since: connectionState === 'open' ? Date.now() : 0
      };

      const response = {
        state: protoState,
        message: this.getConnectionMessage(connectionState),
        timestamp: Date.now(),
        info: info
      };

      callback(null, response);
      
    } catch (error) {
      console.error('Error al obtener estado de conexión:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: `Error al obtener estado de conexión: ${error.message}`
      });
    }
  }

  /**
   * Stream de notificaciones de cambios en el estado de conexión
   */
  WatchConnectionStatus(call) {
    console.log('Cliente conectado para watch de estado de conexión');
    
    // Enviar estado actual inmediatamente
    this.sendConnectionStatus(call);

    // Configurar listener para cambios de estado
    const checkInterval = setInterval(() => {
      this.sendConnectionStatus(call);
    }, 5000); // Verificar cada 5 segundos

    // Limpiar cuando el cliente se desconecta
    call.on('cancelled', () => {
      console.log('Cliente desconectado del watch de conexión');
      clearInterval(checkInterval);
    });

    call.on('error', (error) => {
      console.error('Error en watch de conexión:', error);
      clearInterval(checkInterval);
    });
  }

  /**
   * Envía el estado de conexión actual al stream
   */
  sendConnectionStatus(call) {
    try {
      const connectionState = this.baileysService?._connectionState || 'close';
      
      const stateMap = {
        'open': 2,        // CONNECTED
        'connecting': 1,  // CONNECTING
        'close': 0,       // DISCONNECTED
      };

      const protoState = stateMap[connectionState] || 0;
      
      const info = {
        phone_number: process.env.WA_COUNTRY_CODE + process.env.WA_PHONE || '',
        device_name: 'Baileys Service',
        is_authenticated: connectionState === 'open',
        connected_since: connectionState === 'open' ? Date.now() : 0
      };

      const response = {
        state: protoState,
        message: this.getConnectionMessage(connectionState),
        timestamp: Date.now(),
        info: info
      };

      call.write(response);
      
    } catch (error) {
      console.error('Error al enviar estado de conexión:', error);
    }
  }

  /**
   * Obtiene un mensaje descriptivo del estado de conexión
   */
  getConnectionMessage(state) {
    const messages = {
      'open': 'Conectado a WhatsApp y listo para enviar mensajes',
      'connecting': 'Conectando con WhatsApp...',
      'close': 'Desconectado de WhatsApp'
    };
    return messages[state] || 'Estado desconocido';
  }

  /**
   * Reinicia la conexión con WhatsApp
   */
  async RestartConnection(call, callback) {
    try {
      const { force, reason } = call.request;
      
      console.log(`🔄 RestartConnection solicitado:`, { force, reason });

      // Verificar si hay servicio de Baileys
      if (!this.baileysService) {
        return callback(null, {
          success: false,
          message: 'Servicio Baileys no está disponible',
          new_state: 0, // DISCONNECTED
          timestamp: Date.now()
        });
      }

      const currentState = this.baileysService._connectionState;
      
      // Si está conectado y no es forzado, no reiniciar
      if (currentState === 'open' && !force) {
        return callback(null, {
          success: false,
          message: 'Ya está conectado. Use force=true para reiniciar de todas formas',
          new_state: 2, // CONNECTED
          timestamp: Date.now()
        });
      }

      console.log(`🔄 Reiniciando conexión WhatsApp... Razón: ${reason || 'Manual'}`);

      // Cerrar conexión actual si existe
      if (this.baileysService._sock) {
        try {
          // Remover listeners para evitar reconexión automática
          this.baileysService._sock.ev.removeAllListeners('connection.update');
          await this.baileysService._sock.end();
          console.log('✅ Conexión anterior cerrada');
        } catch (error) {
          console.log('⚠️  Error al cerrar conexión anterior:', error.message);
        }
      }

      // Esperar antes de reconectar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reiniciar conexión
      console.log('📱 Iniciando nueva conexión...');
      await this.baileysService.startConnection();

      // Retornar respuesta inmediata sin esperar
      callback(null, {
        success: true,
        message: 'Proceso de reconexión iniciado',
        new_state: 1, // CONNECTING
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error al reiniciar conexión:', error);
      callback(null, {
        success: false,
        message: `Error al reiniciar: ${error.message}`,
        new_state: 4, // ERROR
        timestamp: Date.now()
      });
    }
  }

}

export default WhatsAppService;