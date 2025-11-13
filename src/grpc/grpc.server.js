import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import HealthService from './health.service.js';
import WhatsAppService from './whatsapp.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GrpcServer {
  constructor(baileysService = null) {
    this.server = new grpc.Server();
    this.healthService = new HealthService();
    this.whatsappService = new WhatsAppService(baileysService);
    this.port = process.env.GRPC_PORT || 50051;
    this.host = process.env.GRPC_HOST || '0.0.0.0';
    
    this.loadProtos();
    this.setupServices();
  }

  /**
   * Carga los archivos proto
   */
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
    this.healthProto = grpc.loadPackageDefinition(healthPackageDefinition).health;

    // Cargar whatsapp.proto
    const whatsappProtoPath = path.join(__dirname, '../proto/whatsapp.proto');
    const whatsappPackageDefinition = protoLoader.loadSync(whatsappProtoPath, protoOptions);
    this.whatsappProto = grpc.loadPackageDefinition(whatsappPackageDefinition).whatsapp;

    console.log('✅ Proto files loaded successfully');
  }

  /**
   * Configura los servicios gRPC
   */
  setupServices() {
    try {
      // Servicio de Health
      this.server.addService(this.healthProto.Health.service, {
        Check: this.healthService.Check.bind(this.healthService),
        Watch: this.healthService.Watch.bind(this.healthService)
      });

      // Servicio de WhatsApp
      this.server.addService(this.whatsappProto.WhatsAppService.service, {
        SendMessage: this.whatsappService.SendMessage.bind(this.whatsappService),
        GetMessageStatus: this.whatsappService.GetMessageStatus.bind(this.whatsappService),
      });

      console.log('✅ gRPC services configured successfully');
    } catch (error) {
      console.error('❌ Error setting up gRPC services:', error);
      throw error;
    }
  }

  /**
   * Inicia el servidor gRPC
   */
  async start() {
    return new Promise((resolve, reject) => {
      const serverCredentials = grpc.ServerCredentials.createInsecure();
      
      this.server.bindAsync(
        `${this.host}:${this.port}`,
        serverCredentials,
        (error, port) => {
          if (error) {
            console.error('❌ Failed to start gRPC server:', error);
            reject(error);
            return;
          }

          this.server.start();
          console.log(`🚀 gRPC Server running on ${this.host}:${port}`);
          console.log(`📋 Available services:`);
          console.log(`   - Health.Check`);
          console.log(`   - Health.Watch`);
          console.log(`   - WhatsAppService.SendMessage`);
          console.log(`   - WhatsAppService.GetMessageStatus`);
          
          resolve(port);
        }
      );
    });
  }

  /**
   * Detiene el servidor gRPC
   */
  stop() {
    return new Promise((resolve) => {
      this.server.tryShutdown((error) => {
        if (error) {
          console.error('Error stopping gRPC server:', error);
          this.server.forceShutdown();
        } else {
          console.log('✅ gRPC Server stopped gracefully');
        }
        resolve();
      });
    });
  }

  /**
   * Actualiza el servicio de Baileys
   */
  updateBaileysService(baileysService) {
    this.whatsappService.baileysService = baileysService;
    console.log('✅ Baileys service updated in gRPC server');
  }

  /**
   * Actualiza el estado de salud del servicio
   */
  updateHealthStatus(status) {
    this.healthService.setStatus(status);
    console.log(`🔄 Health status updated to: ${status}`);
  }

  /**
   * Obtiene estadísticas del servidor
   */
  getStats() {
    return {
      isRunning: this.server !== null,
      port: this.port,
      host: this.host,
      healthStatus: this.healthService.getStatus(),
      messageQueueSize: this.whatsappService.messageQueue.size
    };
  }
}

export default GrpcServer;