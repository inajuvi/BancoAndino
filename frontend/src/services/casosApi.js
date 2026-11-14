import { API_URL } from '../constants.js';

// Error con el estado HTTP, el código del backend y el detalle por campo.
export class ApiError extends Error {
  constructor({ status, code, message, campos = [] }) {
    super(message);
    this.status = status;
    this.code = code;
    this.campos = campos;
  }
}

const MENSAJES = {
  401: 'Tu sesión no es válida o expiró. Ingresa un token de asesor.',
  403: 'Tu rol no permite registrar solicitudes. Se requiere el rol de asesor.',
  429: 'Demasiados intentos seguidos. Espera un momento e intenta de nuevo.',
};

// POST /casos. Devuelve { status, ...caso } con status 201 (creado) o 200 (ya existía).
export async function registrarCaso(payload, token, { signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/casos`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      code: 'RED',
      message: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    });
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ApiError({
      status: respuesta.status,
      code: datos?.error?.code,
      message:
        respuesta.status === 400 || !MENSAJES[respuesta.status]
          ? (datos?.error?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
          : MENSAJES[respuesta.status],
      campos: datos?.error?.campos ?? [],
    });
  }

  return { status: respuesta.status, ...datos };
}
