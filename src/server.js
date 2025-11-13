import { BaileysService } from "./services/Baileys/Baileys.service.js";

/* Cargar variables de entorno */
import dotenv from 'dotenv';
dotenv.config();

/* Variables globales */
const WA_PHONE = process.env.WA_PHONE;
const WA_COUNTRY_CODE = process.env.WA_COUNTRY_CODE;


/* Funcion principal */
const main = async () => {

    //Iniciar servicio Baileys
    const baileysService = new BaileysService();
    //Iniciar conexion
    await baileysService.startConnection();
    //Enviar mensaje de prueba
    const testMessage = "¡Hola! Este es un mensaje de prueba enviado desde Baileys.";
    const sendResult = await baileysService.sendMessage(WA_PHONE, WA_COUNTRY_CODE, testMessage);

}

main();