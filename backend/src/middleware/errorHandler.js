import { AppError } from '../errors.js';

export const notFound = (_req, _res, next) =>
  next(new AppError(404, 'NO_ENCONTRADO', 'La ruta solicitada no existe.'));

const cuerpo = (code, message, campos = []) => ({ error: { code, message, campos } });

// Último middleware: nunca devuelve trazas ni detalles internos al cliente.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json(cuerpo(err.code, err.message, err.campos));
  }
  // Errores de body-parser (JSON mal formado o cuerpo demasiado grande).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(cuerpo('JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.'));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(cuerpo('CUERPO_MUY_GRANDE', 'El cuerpo de la petición es demasiado grande.'));
  }
  // Se registra solo el mensaje: nunca el cuerpo, que podría traer datos personales.
  console.error(`[error] ${req.method} ${req.path}: ${err.message}`);
  return res.status(500).json(cuerpo('ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta de nuevo.'));
};
