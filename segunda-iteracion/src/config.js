// Configuración leída una sola vez desde el entorno (archivo .env vía `node --env-file`).
export const config = Object.freeze({
  modelo: process.env.MODELO || 'claude-haiku-5-5',
  host: process.env.HOST || '127.0.0.1', // solo escucha en la máquina local
  puerto: Number(process.env.PORT) || 4000,
  limitePorMinuto: Number(process.env.RATE_LIMIT_MAX) || 20, // cada solicitud cuesta 3 llamadas al modelo
});
