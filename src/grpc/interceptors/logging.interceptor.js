/**
 * Middleware de logging para gRPC
 * Envuelve los métodos del servicio para registrar llamadas
 */

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0 && metadata.timestamp === undefined) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      )
    })
  ]
});

/**
 * Envuelve un método de servicio gRPC para agregar logging
 * @param {Function} originalMethod - Método original del servicio
 * @param {string} serviceName - Nombre del servicio
 * @param {string} methodName - Nombre del método
 * @returns {Function} Método envuelto con logging
 */
export function wrapMethodWithLogging(originalMethod, serviceName, methodName) {
  return function wrappedMethod(call, callback) {
    const startTime = Date.now();
    const isStreaming = !callback; // Si no hay callback, es streaming
    
    logger.info(`📥 gRPC Request: ${serviceName}.${methodName}`, {
      service: serviceName,
      method: methodName,
      streaming: isStreaming
    });

    if (isStreaming) {
      // Para métodos streaming (sin callback)
      try {
        const result = originalMethod.call(this, call);
        
        // Si el call tiene un evento 'end', lo escuchamos
        if (call.on) {
          call.on('end', () => {
            const duration = Date.now() - startTime;
            logger.info(`✅ gRPC Streaming Ended: ${serviceName}.${methodName} (${duration}ms)`, {
              service: serviceName,
              method: methodName,
              duration: `${duration}ms`
            });
          });

          call.on('error', (error) => {
            const duration = Date.now() - startTime;
            logger.error(`❌ gRPC Streaming Error: ${serviceName}.${methodName}`, {
              service: serviceName,
              method: methodName,
              duration: `${duration}ms`,
              error: error.message
            });
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ gRPC Error: ${serviceName}.${methodName}`, {
          service: serviceName,
          method: methodName,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    } else {
      // Para métodos unary (con callback)
      const wrappedCallback = (error, response) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          logger.error(`❌ gRPC Error: ${serviceName}.${methodName} (${duration}ms)`, {
            service: serviceName,
            method: methodName,
            duration: `${duration}ms`,
            error: error.message
          });
        } else {
          logger.info(`✅ gRPC Response: ${serviceName}.${methodName} (${duration}ms)`, {
            service: serviceName,
            method: methodName,
            duration: `${duration}ms`,
            success: true
          });
        }
        
        callback(error, response);
      };

      try {
        return originalMethod.call(this, call, wrappedCallback);
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ gRPC Exception: ${serviceName}.${methodName}`, {
          service: serviceName,
          method: methodName,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack
        });
        callback(error);
      }
    }
  };
}

/**
 * Envuelve todos los métodos de un objeto de implementación de servicio
 * @param {Object} implementation - Implementación del servicio
 * @param {string} serviceName - Nombre del servicio
 * @returns {Object} Implementación envuelta con logging
 */
export function wrapServiceWithLogging(implementation, serviceName) {
  const wrapped = {};
  
  for (const [methodName, method] of Object.entries(implementation)) {
    if (typeof method === 'function') {
      wrapped[methodName] = wrapMethodWithLogging(method, serviceName, methodName);
    } else {
      wrapped[methodName] = method;
    }
  }
  
  return wrapped;
}

export { logger };
export default wrapServiceWithLogging;
