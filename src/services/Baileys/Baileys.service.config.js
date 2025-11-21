import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import * as QRCode from "qrcode"  // 👈 ESTA LÍNEA ES LA CLAVE
import { Boom } from "@hapi/boom"
import path from "path"
import { fileURLToPath } from "url"
import P from 'pino';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function startSock(
  //Funciones para configurar el socket
  onChangeConnectionState = (connection) => {},
) {
  const authPath = path.join(__dirname, "../../../auth/auth_info")
  console.log("🔑 Intentando cargar autenticación desde:", authPath)
  
  let state, saveCreds
  try {
    const authResult = await useMultiFileAuthState(authPath)
    state = authResult.state
    saveCreds = authResult.saveCreds
    console.log("✅ Estado de autenticación cargado correctamente")
  } catch (error) {
    console.error("❌ Error al cargar el estado de autenticación:", error)
    throw error
  }

  const logger = P({ level: 'error' });
  const sock = makeWASocket({
    printQRInTerminal: true, // muestra el QR en la consola
    auth: state,
    logger
  })

  // Evento: conexión
  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect, qr  } = update

    // Generar QR
    if (qr) {
      // genera QR y muéstralo
      const qrCode = await QRCode.toString(qr, { type: "terminal", small: true });
      console.log("📱 Escanea este código QR con tu aplicación de WhatsApp:");
      console.log(qrCode);
      // o envíalo al front-end
    }

    //
    if (connection === "close") {
      onChangeConnectionState(connection);
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : 0) !== DisconnectReason.loggedOut

      console.log("❌ Conexión cerrada, reconectando:", shouldReconnect)
      
      // Solo reconectar si no es un cierre manual o reemplazo de sesión
      const statusCode = lastDisconnect?.error instanceof Boom 
        ? lastDisconnect.error.output?.statusCode 
        : 0;
      
      // No reconectar en caso de conflicto (sesión reemplazada)
      if (statusCode === 440) {
        console.log("⚠️  Sesión reemplazada en otro dispositivo. No reconectando automáticamente.");
        return;
      }
      
      if (shouldReconnect) {
        console.log("🔄 Reconectando en 5 segundos...");
        setTimeout(() => startSock(onChangeConnectionState), 5000);
      }
    } 

    //
    else if (connection === "open") {
      console.log("✅ Conectado a WhatsApp")
      onChangeConnectionState(connection);
    }

  })

  // Evento: guardar credenciales
  sock.ev.on("creds.update", saveCreds)

  /* // Evento: recibir mensajes
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid || ""
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text

    console.log("💬 Mensaje de", from, ":", text)

    // Responder automáticamente
    if (text?.toLowerCase() === "hola") {
      await sock.sendMessage(from, { text: "👋 ¡Hola! Soy tu bot Baileys" })
    }
  }) */

  return sock;

}