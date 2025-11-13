import grpc from '@grpc/grpc-js';

class HealthService {
  constructor() {
    this.status = 'SERVING';
    this.version = '1.0.0';
  }

  /**
   * Verifica el estado del servicio
   */
  Check(call, callback) {
    const request = call.request;
    console.log(`Health check requested for service: ${request.service || 'default'}`);

    const response = {
      status: this.status === 'SERVING' ? 1 : 2, // SERVING = 1, NOT_SERVING = 2
      message: this.status === 'SERVING' ? 'Service is healthy' : 'Service is not available',
      timestamp: Date.now(),
      version: this.version
    };

    callback(null, response);
  }

  /**
   * Stream de estado de salud
   */
  Watch(call) {
    const request = call.request;
    console.log(`Health watch started for service: ${request.service || 'default'}`);

    // Envía el estado actual inmediatamente
    const sendStatus = () => {
      const response = {
        status: this.status === 'SERVING' ? 1 : 2,
        message: this.status === 'SERVING' ? 'Service is healthy' : 'Service is not available',
        timestamp: Date.now(),
        version: this.version
      };
      
      call.write(response);
    };

    // Envía estado inicial
    sendStatus();

    // Envía actualizaciones cada 30 segundos
    const interval = setInterval(sendStatus, 30000);

    // Limpia el intervalo cuando la conexión se cierra
    call.on('cancelled', () => {
      console.log('Health watch cancelled');
      clearInterval(interval);
    });

    call.on('error', (error) => {
      console.error('Health watch error:', error);
      clearInterval(interval);
    });
  }

  /**
   * Actualiza el estado del servicio
   */
  setStatus(status) {
    this.status = status;
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return this.status;
  }
}

export default HealthService;