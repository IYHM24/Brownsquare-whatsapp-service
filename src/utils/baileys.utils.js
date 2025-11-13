
// phone: puede ser "5215551234567" o "+52 1 555 123 4567"
const formatJid = (phone) => {
  const digits = phone.toString().replace(/\D/g, ''); // quita +, espacios, paréntesis, etc.
  return digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
}

/**
 * Enviar un texto simple.
 * sock: instancia devuelta por makeWASocket (startSock)
 * phone: número con código de país o cualquier string (se normaliza)
 * text: texto a enviar
 */
export const sendText = async (sock, phone, text) => {
  const jid = formatJid(phone);
  try {
    const result = await sock.sendMessage(jid, { text });
    // result contiene la info del mensaje enviado (id, timestamp, etc.)
    return result;
  } catch (err) {
    // Manejo básico de errores: Boom u otros
    console.error("Error enviando mensaje:", err);
    throw err;
  }
}