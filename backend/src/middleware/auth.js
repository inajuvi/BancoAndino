import jwt from 'jsonwebtoken';
import { AppError } from '../errors.js';

// 401 si no hay token válido. El inicio de sesión real (Cognito) llega con la HU-10;
// por ahora el token HS256 se emite con `npm run token`.
export const authenticate = (config) => (req, _res, next) => {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return next(new AppError(401, 'NO_AUTENTICADO', 'Debes iniciar sesión para continuar.'));
  }
  try {
    const { sub, rol } = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.usuario = { id: String(sub ?? ''), rol };
    return next();
  } catch {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'Tu sesión no es válida o expiró.'));
  }
};

// 403 si el usuario autenticado no tiene el rol requerido.
export const requireRole = (rol) => (req, _res, next) => {
  if (req.usuario?.rol !== rol) {
    return next(new AppError(403, 'SIN_PERMISO', 'Tu rol no permite realizar esta acción.'));
  }
  return next();
};
