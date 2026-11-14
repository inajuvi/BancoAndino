import { z } from 'zod';

export const CANALES = ['CALL_CENTER', 'WHATSAPP', 'REDES_SOCIALES'];
const MAX_DATOS_EXTRAIDOS = 20;

// Mensajes en español: llegan tal cual a la consola del asesor.
const texto = (nombre) =>
  z.string({
    required_error: `${nombre} es obligatorio`,
    invalid_type_error: `${nombre} debe ser texto`,
  });

// Contrato de entrada de POST /casos. El límite del texto es configurable (CA-4).
export function buildCasoSchema(maxTextLength) {
  const salidaA3 = z
    .object({
      resumen: texto('resumen').trim().max(2000, 'resumen supera 2000 caracteres').optional(),
      tono: texto('tono').trim().max(50, 'tono supera 50 caracteres').optional(),
      datos_extraidos: z
        .record(z.string().max(500, 'cada dato extraído admite hasta 500 caracteres'))
        .refine((d) => Object.keys(d).length <= MAX_DATOS_EXTRAIDOS, {
          message: `datos_extraidos admite hasta ${MAX_DATOS_EXTRAIDOS} datos`,
        })
        .optional(),
    })
    .strict();

  return z
    .object({
      id_caso: texto('id_caso')
        .trim()
        .min(1, 'id_caso es obligatorio')
        .max(36, 'id_caso admite hasta 36 caracteres')
        .regex(/^[A-Za-z0-9_-]+$/, 'id_caso solo admite letras, números, guion y guion bajo'),
      canal: z.enum(CANALES, {
        errorMap: (_issue, ctx) => ({
          message:
            ctx.data === undefined
              ? 'canal es obligatorio'
              : 'canal debe ser CALL_CENTER, WHATSAPP o REDES_SOCIALES',
        }),
      }),
      texto_cliente: texto('texto_cliente')
        .trim()
        .min(1, 'texto_cliente es obligatorio')
        .max(maxTextLength, `texto_cliente supera el límite de ${maxTextLength} caracteres`),
      salida_a3: salidaA3.optional().default({}),
    })
    .strict();
}
