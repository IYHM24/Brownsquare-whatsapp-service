import { startSock } from "./services/Baileys/Baileys.service.js";
import { sendText } from "./utils/baileys.utils.js";

/* Cargar variables de entorno */
import dotenv from 'dotenv';
dotenv.config();

/* Variables globales */
const WA_PHONE = process.env.WA_PHONE;
const WA_COUNTRY_CODE = process.env.WA_COUNTRY_CODE;
let connectionState = "close";
let sock = null;

/* Funcion de conexion */
const onChangeConnectionState = (connection) => {
    console.log("Estado de conexión:", connection);
    connectionState = connection;
}

/* Funcion principal */
const main = async () => {

    /* Iniciar servicios */
    sock = await startSock(onChangeConnectionState);

    while (connectionState !== "open") {
        console.log("Esperando conexión...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // espera 2 segundos
    }

    /* Enviar un mensaje de texto */
    await sendText(sock, `${WA_COUNTRY_CODE}${WA_PHONE}`, "Test").then((result) => {
        console.log("Mensaje enviado:", result);
    }).catch((err) => {
        console.error("Error al enviar mensaje:", err);
    });

}

main();