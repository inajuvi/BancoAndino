import { AppError } from '../errors.js';

// Convierte los issues de zod a [{ campo, mensaje }].
function aCampos(issues) {
  return issues.map((issue) => {
    const ruta = issue.path.join('.');
    const campo =
      issue.code === 'unrecognized_keys'
        ? [ruta, issue.keys[0]].filter(Boolean).join('.')
        : ruta || 'cuerpo';
    const mensaje =
      issue.code === 'unrecognized_keys' ? `${campo} no es un campo permitido` : issue.message;
    return { campo, mensaje };
  });
}

// Valida y reemplaza req.body por la versión limpia (sin campos desconocidos, con trim).
export const validateBody = (schema) => (req, _res, next) => {
  const resultado = schema.safeParse(req.body ?? {});
  if (!resultado.success) {
    const campos = aCampos(resultado.error.issues);
    return next(new AppError(400, 'SOLICITUD_INVALIDA', campos[0].mensaje, campos));
  }
  req.body = resultado.data;
  return next();
};
