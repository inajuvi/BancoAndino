// Lee y valida la configuración una sola vez; si falta algo crítico, el proceso falla al arrancar.

const aEntero = (valor, porDefecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

export function loadConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET es obligatorio y debe tener al menos 16 caracteres.');
  }

  return Object.freeze({
    port: aEntero(env.PORT, 3000),
    jwtSecret,
    maxTextLength: aEntero(env.MAX_TEXT_LENGTH, 5000),
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    rateLimitMax: aEntero(env.RATE_LIMIT_MAX, 60),
  });
}
