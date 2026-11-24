// Aplicación HTTP: valida la entrada, aplica cabeceras de seguridad y límite de peticiones,
// y traduce los errores a mensajes para el asesor sin exponer detalles internos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ErrorDelModelo } from './agentes.js';

const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const esquemaSolicitud = z
  .object({
    id_caso: z.string().trim().min(1).max(36).regex(/^[\w-]+$/, 'Solo letras, números, guion y guion bajo'),
    canal: z.enum(['CALL_CENTER', 'WHATSAPP', 'REDES_SOCIALES']),
    texto: z.string().trim().min(1).max(5000),
    resumen: z.string().trim().max(2000).default(''),
    tono: z.enum(['', 'Neutro', 'Preocupado', 'Molesto', 'Urgente']).default(''),
    datos: z
      .array(z.tuple([z.string().trim().min(1).max(50), z.string().trim().min(1).max(500)]))
      .max(20)
      .default([]),
  })
  .strict();

function errorDelModelo(error) {
  if (error instanceof Anthropic.AuthenticationError) return [503, 'Falta la API key o no es válida. Revisa el archivo .env.'];
  if (error instanceof Anthropic.RateLimitError) return [429, 'El modelo está saturado. Intenta de nuevo en unos segundos.'];
  if (error instanceof Anthropic.APIConnectionError) return [503, 'No hay conexión con el modelo.'];
  if (error instanceof Anthropic.APIError) return [502, `El modelo respondió con un error (${error.status}).`];
  if (error instanceof ErrorDelModelo) return [502, error.message];
  return null;
}

/**
 * @param {{ categorizar: Function, modelo: string, limitePorMinuto?: number, registrarError?: (e: unknown) => void }} opciones
 */
export function crearApp({ categorizar, modelo, limitePorMinuto = 20, registrarError = console.error }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  app.use(express.static(PUBLICO));

  app.get('/api/info', (_req, res) => res.json({ modelo }));

  app.post(
    '/api/categorizar',
    rateLimit({ windowMs: 60_000, limit: limitePorMinuto, standardHeaders: 'draft-8', legacyHeaders: false }),
    async (req, res) => {
      const entrada = esquemaSolicitud.safeParse(req.body);
      if (!entrada.success) {
        return res.status(400).json({
          error: 'La solicitud no es válida.',
          campos: entrada.error.issues.map((i) => i.path.join('.') || '(cuerpo)'),
        });
      }
      try {
        const inicio = Date.now();
        const resultado = await categorizar(entrada.data);
        res.json({ ...resultado, ms_total: Date.now() - inicio });
      } catch (error) {
        const conocido = errorDelModelo(error);
        if (conocido) return res.status(conocido[0]).json({ error: conocido[1] });
        registrarError(error);
        res.status(500).json({ error: 'Error interno. Intenta de nuevo.' });
      }
    },
  );

  // JSON mal formado o cuerpo demasiado grande
  app.use((error, _req, res, _next) => {
    const estado = error.status ?? 500;
    if (estado >= 500) registrarError(error);
    res.status(estado).json({ error: estado === 413 ? 'La solicitud es demasiado grande.' : 'La solicitud no es válida.' });
  });

  return app;
}
