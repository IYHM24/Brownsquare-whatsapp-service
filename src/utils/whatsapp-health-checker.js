/**
 * Utilidad para verificar y gestionar la salud de la conexión de WhatsApp
 */

import { logger } from '../grpc/interceptors/logging.interceptor.js';

class WhatsAppHealthChecker {
  /**
   * Estados que requieren reinicio de conexión
   */
  static STATES_REQUIRING_RESTART = [
    'DISCONNECTED',
    'ERROR',
    'LOGGED_OUT'
  ];

  /**
   * Estados que NO requieren acción
   */
  static HEALTHY_STATES = [
    'CONNECTED',
    'CONNECTING',
    'RECONNECTING'
  ];

  /**
   * Valida el estado de la conexión de WhatsApp y reinicia si es necesario
   * @param {Object} baileysService - Instancia del servicio de Baileys
   * @returns {Promise<Object>} Resultado de la validación y acción tomada
   */
  static async checkAndRestart(baileysService) {
    try {
      if (!baileysService) {
        logger.error('❌ BaileysService no está disponible para verificar');
        return {
          success: false,
          action: 'none',
          reason: 'BaileysService no disponible',
          currentState: 'UNKNOWN'
        };
      }

      // Obtener el estado actual
      const currentState = baileysService.getConnectionState();
      const stateString = currentState.toString();

      logger.info(`🔍 Verificando salud de WhatsApp. Estado actual: ${stateString}`);

      // Determinar si requiere reinicio
      const requiresRestart = this.STATES_REQUIRING_RESTART.includes(stateString);
      const isHealthy = this.HEALTHY_STATES.includes(stateString);

      if (requiresRestart) {
        logger.warn(`⚠️ Estado ${stateString} detectado. Reiniciando conexión...`);
        
        try {
          // Intentar reiniciar la conexión
          await baileysService.restartConnection();
          
          logger.info('✅ Conexión reiniciada exitosamente');
          
          return {
            success: true,
            action: 'restarted',
            reason: `Estado ${stateString} requiere reinicio`,
            previousState: stateString,
            currentState: baileysService.getConnectionState().toString()
          };
        } catch (restartError) {
          logger.error('❌ Error al reiniciar conexión:', restartError);
          
          return {
            success: false,
            action: 'restart_failed',
            reason: `Error al reiniciar: ${restartError.message}`,
            currentState: stateString,
            error: restartError.message
          };
        }
      } else if (isHealthy) {
        logger.info(`✅ Conexión saludable. Estado: ${stateString}. No se requiere acción.`);
        
        return {
          success: true,
          action: 'none',
          reason: `Estado ${stateString} es saludable`,
          currentState: stateString
        };
      } else {
        logger.info(`ℹ️ Estado desconocido: ${stateString}. No se tomará acción.`);
        
        return {
          success: true,
          action: 'none',
          reason: `Estado ${stateString} no requiere acción inmediata`,
          currentState: stateString
        };
      }
    } catch (error) {
      logger.error('❌ Error al verificar salud de WhatsApp:', error);
      
      return {
        success: false,
        action: 'check_failed',
        reason: `Error en verificación: ${error.message}`,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Ejecuta verificación periódica de salud
   * @param {Object} baileysService - Instancia del servicio de Baileys
   * @param {number} intervalMs - Intervalo en milisegundos (por defecto 30 segundos)
   * @returns {NodeJS.Timeout} ID del intervalo para poder cancelarlo
   */
  static startPeriodicHealthCheck(baileysService, intervalMs = 30000) {
    logger.info(`🔄 Iniciando verificación periódica de salud cada ${intervalMs / 1000}s`);
    
    // Primera verificación inmediata
    this.checkAndRestart(baileysService);
    
    // Verificaciones periódicas
    const intervalId = setInterval(async () => {
      await this.checkAndRestart(baileysService);
    }, intervalMs);

    return intervalId;
  }

  /**
   * Detiene la verificación periódica
   * @param {NodeJS.Timeout} intervalId - ID del intervalo a detener
   */
  static stopPeriodicHealthCheck(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      logger.info('🛑 Verificación periódica de salud detenida');
    }
  }

  /**
   * Obtiene información detallada del estado actual
   * @param {Object} baileysService - Instancia del servicio de Baileys
   * @returns {Object} Información detallada del estado
   */
  static getDetailedStatus(baileysService) {
    if (!baileysService) {
      return {
        available: false,
        state: 'UNKNOWN',
        requiresRestart: false,
        isHealthy: false,
        message: 'BaileysService no disponible'
      };
    }

    const currentState = baileysService.getConnectionState().toString();
    const requiresRestart = this.STATES_REQUIRING_RESTART.includes(currentState);
    const isHealthy = this.HEALTHY_STATES.includes(currentState);

    return {
      available: true,
      state: currentState,
      requiresRestart,
      isHealthy,
      message: requiresRestart 
        ? 'Conexión requiere reinicio' 
        : isHealthy 
          ? 'Conexión saludable' 
          : 'Estado desconocido',
      timestamp: new Date().toISOString()
    };
  }
}

export default WhatsAppHealthChecker;
