import { startSock } from "./Baileys.service.config.js";
import { sendText } from "../../utils/baileys.utils.js";

export class BaileysService {

    /* Socker */
    _sock;
    /* Estado de conexión */
    _connectionState;

    constructor() { }

    /**
     * Cambio de estado en la conexion
     * @param {*} connection 
     */
    onChangeConnectionState = (connection) => {
        console.log("Estado de conexión:", connection);
        this._connectionState = connection;
    }

    /**
     * Inicia la conexión con WhatsApp usando Baileys
     * @returns 
     */
    startConnection = async () => {
        try {
            //Establecer conexión
            console.log("Iniciando conexión Baileys...");
            this._sock = await startSock(this.onChangeConnectionState);

            //Esperar a que la conexión esté abierta
            console.log("Esperando conexión...");
            return new Promise((resolve) => {
                const checkConnection = () => {
                    if (this._connectionState === "open") {
                        console.log("✅ Conexión WhatsApp establecida con éxito.");
                        resolve(this._sock);
                    } else {
                        setTimeout(checkConnection, 1000);
                    }
                };
                checkConnection();
            });

        } catch (error) {
            console.error("✖️ Error al iniciar la conexión:", error);
            return null;
        }
    }

    /**
     * Enviar un mensaje de texto a través de Baileys
     * @param {*} to 
     * @param {*} countryCode 
     * @param {*} message 
     * @returns 
     */
    sendMessage = async (to, countryCode, message) => {
        try {

            //Mostrar info del mensaje
            console.log("Enviando mensaje a través de Baileys...");
            console.log("📲 Numero a enviar: ", to);
            console.log("📝 Mensaje: ", message);

            //Comprobar estado de la conexión
            if(this._connectionState === "open") {
                
                //Enviar mensajes
                await sendText(this._sock, `${countryCode}${to}`, message).then((result) => {
                    console.log("Mensaje enviado:", result);
                }).catch((err) => {
                    console.error("Error al enviar mensaje:", err);
                });

                //Retornar exito
                console.log("✔️ Mensaje enviado con éxito.");
                return true;

            }else {
                console.error("✖️ No se puede enviar el mensaje, la conexión no está abierta.");
            }

        } catch (error) {
            console.error("✖️ Error al enviar mensaje:", error);
            return false;
        }
    }

}
