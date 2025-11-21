using Brownsquare_twilio_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WhatsAppService;

namespace Brownsquare_twilio_backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("whatsapp")]
    public class WhatsAppController : ControllerBase
    {
        /// <summary>
        /// Variables
        /// </summary>
        private readonly ILogger<WhatsAppController> _logger;
        private readonly WhatsAppGrpcClient _whatsAppGrpcClient;
        
        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger"></param>
        public WhatsAppController(ILogger<WhatsAppController> logger)
        {
            _logger = logger;
            _whatsAppGrpcClient = new WhatsAppGrpcClient();
        }

        /// <summary>
        /// Endpoint para enviar un mensaje de WhatsApp
        /// </summary>
        /// <param name="request">Datos del mensaje a enviar</param>
        /// <returns>Respuesta del envío del mensaje</returns>
        [HttpPost]
        [Route("send")]
        public async Task<IActionResult> SendMessageAsync([FromBody] SendMessageRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Numero) || 
                    string.IsNullOrWhiteSpace(request.CodigoPais) || 
                    string.IsNullOrWhiteSpace(request.Mensaje))
                {
                    return BadRequest("Número, código de país y mensaje son requeridos");
                }

                var response = await _whatsAppGrpcClient.SendMessageAsync(
                    request.Numero,
                    request.CodigoPais,
                    request.Mensaje,
                    request.MessageId,
                    request.Type
                );

                if (response == null)
                {
                    return StatusCode(500, "Error al enviar el mensaje");
                }

                if (!response.Success)
                {
                    return BadRequest(new { message = response.Message });
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error al enviar mensaje de WhatsApp");
                _logger.LogError(ex.Message);
                return StatusCode(500, "Error interno al enviar el mensaje");
            }
        }

        /// <summary>
        /// Endpoint para obtener el estado de un mensaje enviado
        /// </summary>
        /// <param name="messageId">ID del mensaje a consultar</param>
        /// <returns>Estado del mensaje</returns>
        [HttpGet]
        [Route("message-status/{messageId}")]
        public async Task<IActionResult> GetMessageStatusAsync(string messageId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(messageId))
                {
                    return BadRequest("El ID del mensaje es requerido");
                }

                var response = await _whatsAppGrpcClient.GetMessageStatusAsync(messageId);

                if (response == null)
                {
                    return StatusCode(500, "Error al obtener el estado del mensaje");
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error al obtener estado del mensaje {messageId}");
                _logger.LogError(ex.Message);
                return StatusCode(500, "Error interno al consultar el estado");
            }
        }

        /// <summary>
        /// Endpoint para obtener el estado actual de la conexión con WhatsApp
        /// </summary>
        /// <returns>Estado de la conexión</returns>
        [HttpGet]
        [Route("connection-status")]
        public async Task<IActionResult> GetConnectionStatusAsync()
        {
            try
            {
                var response = await _whatsAppGrpcClient.GetConnectionStatusAsync();

                if (response == null)
                {
                    return StatusCode(500, "Error al obtener el estado de conexión");
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error al obtener estado de conexión de WhatsApp");
                _logger.LogError(ex.Message);
                return StatusCode(500, "Error interno al consultar el estado de conexión");
            }
        }

        /// <summary>
        /// Endpoint para verificar si WhatsApp está conectado (helper simplificado)
        /// </summary>
        /// <returns>True si está conectado, false en caso contrario</returns>
        [HttpGet]
        [Route("is-connected")]
        public async Task<IActionResult> IsConnectedAsync()
        {
            try
            {
                var isConnected = await _whatsAppGrpcClient.IsWhatsAppConnectedAsync();
                
                return Ok(new 
                { 
                    connected = isConnected,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError("Error al verificar conexión de WhatsApp");
                _logger.LogError(ex.Message);
                return StatusCode(500, "Error interno al verificar conexión");
            }
        }

        /// <summary>
        /// Endpoint para reiniciar la conexión con WhatsApp
        /// </summary>
        /// <param name="request">Parámetros del reinicio</param>
        /// <returns>Resultado del reinicio</returns>
        [HttpPost]
        [Route("restart-connection")]
        public async Task<IActionResult> RestartConnectionAsync([FromBody] RestartConnectionRequest? request)
        {
            try
            {
                var force = request?.Force ?? false;
                var reason = request?.Reason ?? "Reinicio manual desde API";

                var response = await _whatsAppGrpcClient.RestartConnectionAsync(force, reason);

                if (response == null)
                {
                    return StatusCode(500, "Error al reiniciar la conexión");
                }

                if (!response.Success)
                {
                    return BadRequest(new { message = response.Message });
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error al reiniciar conexión de WhatsApp");
                _logger.LogError(ex.Message);
                return StatusCode(500, "Error interno al reiniciar conexión");
            }
        }

        /// <summary>
        /// Endpoint SSE (Server-Sent Events) para monitorear cambios en el estado de conexión
        /// </summary>
        /// <param name="cancellationToken">Token de cancelación</param>
        /// <returns>Stream de eventos de conexión</returns>
        [HttpGet]
        [Route("connection-status/watch")]
        public async Task WatchConnectionStatusAsync(CancellationToken cancellationToken)
        {
            Response.Headers.Add("Content-Type", "text/event-stream");
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("Connection", "keep-alive");

            try
            {
                _logger.LogInformation("Cliente conectado al stream de estado de conexión");

                await foreach (var status in _whatsAppGrpcClient.WatchConnectionStatusAsync(cancellationToken))
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        state = status.State.ToString(),
                        message = status.Message,
                        timestamp = status.Timestamp,
                        phoneNumber = status.Info?.PhoneNumber,
                        deviceName = status.Info?.DeviceName,
                        isAuthenticated = status.Info?.IsAuthenticated,
                        connectedSince = status.Info?.ConnectedSince
                    });

                    await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);

                    _logger.LogDebug($"Estado enviado: {status.State}");
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Cliente desconectado del stream de estado de conexión");
            }
            catch (Exception ex)
            {
                _logger.LogError("Error en el stream de estado de conexión");
                _logger.LogError(ex.Message);
            }
        }

        /// <summary>
        /// Endpoint SSE (Server-Sent Events) para monitorear la salud del servicio
        /// </summary>
        /// <param name="cancellationToken">Token de cancelación</param>
        /// <returns>Stream de eventos de salud</returns>
        [HttpGet]
        [Route("health/watch")]
        public async Task WatchHealthAsync(CancellationToken cancellationToken)
        {
            Response.Headers.Add("Content-Type", "text/event-stream");
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("Connection", "keep-alive");

            try
            {
                _logger.LogInformation("Cliente conectado al stream de salud del servicio");

                await foreach (var health in _whatsAppGrpcClient.WatchHealthAsync(cancellationToken))
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = health.Status.ToString(),
                        timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                    });

                    await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);

                    _logger.LogDebug($"Salud enviada: {health.Status}");
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Cliente desconectado del stream de salud");
            }
            catch (Exception ex)
            {
                _logger.LogError("Error en el stream de salud");
                _logger.LogError(ex.Message);
            }
        }
    }
}
