import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GrpcClient {
  constructor(serverAddress = 'localhost:50051') {
    this.serverAddress = serverAddress;
    this.clients = {};
    this.loadProtos();
  }

  loadProtos() {
    const protoOptions = {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    };

    // Cargar health.proto
    const healthProtoPath = path.join(__dirname, '../proto/health.proto');
    const healthPackageDefinition = protoLoader.loadSync(healthProtoPath, protoOptions);
    const healthProto = grpc.loadPackageDefinition(healthPackageDefinition).health;
    
    // Cargar whatsapp.proto
    const whatsappProtoPath = path.join(__dirname, '../proto/whatsapp.proto');
    const whatsappPackageDefinition = protoLoader.loadSync(whatsappProtoPath, protoOptions);
    const whatsappProto = grpc.loadPackageDefinition(whatsappPackageDefinition).whatsapp;

    // Crear clientes
    this.clients.health = new healthProto.Health(
      this.serverAddress, 
      grpc.credentials.createInsecure()
    );

    this.clients.whatsapp = new whatsappProto.WhatsAppService(
      this.serverAddress, 
      grpc.credentials.createInsecure()
    );

    console.log(`✅ gRPC clients connected to ${this.serverAddress}`);
  }

  // Health Service Methods
  async checkHealth(serviceName = '') {
    return new Promise((resolve, reject) => {
      this.clients.health.Check({ service: serviceName }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  watchHealth(serviceName = '', onData, onError) {
    const call = this.clients.health.Watch({ service: serviceName });
    
    call.on('data', onData);
    call.on('error', onError || console.error);
    call.on('end', () => console.log('Health watch ended'));
    
    return call;
  }

  // WhatsApp Service Methods
  async sendMessage(numero, codigoPais, mensaje, messageId = null) {
    return new Promise((resolve, reject) => {
      const request = {
        numero,
        codigo_pais: codigoPais,
        mensaje,
        message_id: messageId,
        type: 0 // TEXT
      };

      this.clients.whatsapp.SendMessage(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getMessageStatus(messageId, whatsappId = null) {
    return new Promise((resolve, reject) => {
      const request = {
        message_id: messageId,
        whatsapp_id: whatsappId
      };

      this.clients.whatsapp.GetMessageStatus(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  sendBulkMessages(messages, onResponse, onError) {
    const call = this.clients.whatsapp.SendBulkMessages();
    
    call.on('data', onResponse);
    call.on('error', onError || console.error);
    call.on('end', () => console.log('Bulk messages completed'));

    // Enviar mensajes
    messages.forEach(msg => {
      call.write({
        numero: msg.numero,
        codigo_pais: msg.codigo_pais,
        mensaje: msg.mensaje,
        message_id: msg.message_id,
        type: 0 // TEXT
      });
    });

    call.end();
    return call;
  }

  close() {
    if (this.clients.health) {
      this.clients.health.close();
    }
    if (this.clients.whatsapp) {
      this.clients.whatsapp.close();
    }
    console.log('✅ gRPC clients closed');
  }
}

// Ejemplo de uso
async function example() {
  const client = new GrpcClient('localhost:50051');

  try {
    // 1. Verificar salud del servicio
    console.log('🔍 Checking service health...');
    const healthResponse = await client.checkHealth();
    console.log('Health Response:', healthResponse);

    // 2. Enviar un mensaje
    console.log('📤 Sending WhatsApp message...');
    const messageResponse = await client.sendMessage(
      '3506930989',  // numero
      '57',          // codigo_pais
      '¡Hola desde gRPC! Este es un mensaje de prueba.'  // mensaje
    );
    console.log('Message Response:', messageResponse);

    // 3. Verificar estado del mensaje
    if (messageResponse.success && messageResponse.message_id) {
      console.log('🔍 Checking message status...');
      const statusResponse = await client.getMessageStatus(messageResponse.message_id);
      console.log('Status Response:', statusResponse);
    }

    // 4. Ejemplo de envío masivo
    console.log('📤 Sending bulk messages...');
    const bulkMessages = [
      {
        numero: '3001234567',
        codigo_pais: '57',
        mensaje: 'Mensaje masivo 1',
        message_id: 'bulk_msg_1'
      },
      {
        numero: '3009876543',
        codigo_pais: '57',
        mensaje: 'Mensaje masivo 2',
        message_id: 'bulk_msg_2'
      }
    ];

    client.sendBulkMessages(
      bulkMessages,
      (response) => {
        console.log('Bulk Message Response:', response);
      },
      (error) => {
        console.error('Bulk Message Error:', error);
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cerrar después de un tiempo
    setTimeout(() => {
      client.close();
    }, 5000);
  }
}

// Ejecutar ejemplo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  example();
}

export default GrpcClient;