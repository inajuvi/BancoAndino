import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { buildCasoSchema } from '../schemas/casoSchema.js';

// Vista pública del caso: nunca expone texto, resumen ni datos extraídos.
const vistaCaso = (caso, creado) => ({
  id_caso: caso.id_caso,
  trace_id: caso.trace_id,
  estado: caso.estado,
  canal: caso.canal,
  fecha_recepcion: caso.fecha_recepcion,
  ya_existia: !creado,
});

export function createCasosRouter({ config, service }) {
  const router = express.Router();

  // Primero identidad y rol (CA-8); solo después se lee el cuerpo.
  router.use(authenticate(config), requireRole('asesor'));
  router.use(express.json({ limit: '100kb' }));

  // POST /casos -> 201 (creado), 200 (duplicado), 400, 401, 403.
  router.post('/', validateBody(buildCasoSchema(config.maxTextLength)), async (req, res, next) => {
    try {
      const { caso, creado } = await service.registrar({ datos: req.body, usuario: req.usuario });
      res.status(creado ? 201 : 200).json(vistaCaso(caso, creado));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
