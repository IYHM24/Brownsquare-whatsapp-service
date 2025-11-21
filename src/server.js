import { BaileysService } from "./services/Baileys/Baileys.service.js";
import GrpcServer from "./grpc/grpc.server.js";
import WhatsAppHealthChecker from "./utils/whatsapp-health-checker.js";

/* Cargar variables de entorno */
import dotenv from 'dotenv';
dotenv.config();

/* Variables globales */
const WA_PHONE = process.env.WA_PHONE;
const WA_COUNTRY_CODE = process.env.WA_COUNTRY_CODE;
const GRPC_PORT = process.env.GRPC_PORT || 50051;
const GRPC_HOST = process.env.GRPC_HOST || '0.0.0.0';
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000; // 60 segundos por defecto

/* Variables de control */
let grpcServer = null;
let baileysService = null;
let healthCheckIntervalId = null;

/* Funcion para manejar el cierre graceful */
const gracefulShutdown = async (signal) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Detener verificación periódica de salud
        if (healthCheckIntervalId) {
            console.log('🛑 Stopping health check...');
            WhatsAppHealthChecker.stopPeriodicHealthCheck(healthCheckIntervalId);
            healthCheckIntervalId = null;
        }
        
        if (grpcServer) {
            console.log('🛑 Stopping gRPC server...');
            await grpcServer.stop();
        }
        
        if (baileysService && baileysService._sock) {
            console.log('🛑 Closing Baileys connection...');
            try {
                await baileysService._sock.end();
                console.log('✅ Baileys connection closed');
            } catch (error) {
                console.log('⚠️  Baileys connection already closed or error closing:', error.message);
            }
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

/* Funcion principal */
const main = async () => {
    try {
        console.log('🚀 Starting WhatsApp Service...');
        
        // Iniciar servicio Baileys
        console.log('📱 Initializing Baileys service...');
        baileysService = new BaileysService();
        
        // Crear servidor gRPC (sin Baileys inicialmente)
        console.log('⚡ Initializing gRPC server...');
        grpcServer = new GrpcServer(baileysService);
        
        // Iniciar servidor gRPC
        await grpcServer.start();
        grpcServer.updateHealthStatus('SERVING');
        
        // Iniciar conexión Baileys
        console.log('🔗 Starting Baileys connection...');
        await baileysService.startConnection();
        
        // Actualizar el servicio de Baileys en gRPC
        grpcServer.updateBaileysService(baileysService);
        
        // Enviar mensaje de prueba solo si están definidas las variables
        if (WA_PHONE && WA_COUNTRY_CODE) {
            console.log('📤 Sending test message...');
            const testMessage = "¡Hola! Servicio WhatsApp con gRPC iniciado correctamente.";
            const sendResult = await baileysService.sendMessage(WA_PHONE, WA_COUNTRY_CODE, testMessage);
            console.log('📤 Test message result:', sendResult);
        } else {
            console.log('⚠️  WA_PHONE or WA_COUNTRY_CODE not defined, skipping test message');
        }
        
        console.log('✅ Service started successfully!');
        console.log(`🌐 gRPC Server: ${GRPC_HOST}:${GRPC_PORT}`);
        console.log('📱 WhatsApp: Connected and ready');
        
        // Iniciar verificación periódica de salud de WhatsApp
        console.log(`🏥 Starting WhatsApp health check (every ${HEALTH_CHECK_INTERVAL / 1000}s)...`);
        healthCheckIntervalId = WhatsAppHealthChecker.startPeriodicHealthCheck(
            baileysService, 
            HEALTH_CHECK_INTERVAL
        );
        
        // Mostrar estadísticas cada 60 segundos
        setInterval(() => {
            const stats = grpcServer.getStats();
            const healthStatus = WhatsAppHealthChecker.getDetailedStatus(baileysService);
            
            console.log('📊 Server Stats:', {
                gRPC: stats.isRunning ? 'Running' : 'Stopped',
                health: stats.healthStatus,
                messageQueue: stats.messageQueueSize,
                whatsappState: healthStatus.state,
                whatsappHealthy: healthStatus.isHealthy,
                timestamp: new Date().toISOString()
            });
        }, 60000);
        
    } catch (error) {
        console.error('❌ Error starting service:', error);
        
        if (grpcServer) {
            grpcServer.updateHealthStatus('NOT_SERVING');
        }
        
        // Intentar shutdown graceful
        await gracefulShutdown('ERROR');
    }
};

/* Manejar señales de cierre */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

/* Manejar errores no capturados */
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

main();