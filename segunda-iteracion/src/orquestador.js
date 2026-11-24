// Orquestador: protege la solicitud, coordina a los agentes, aplica el motor de reglas
// y arma el JSON de A4 (Figura 1 del Hito 1).
import { nombreDe } from './categorias.js';
import { protegerSolicitud } from './vault.js';
import { evaluarReglas } from './reglas.js';

const UMBRAL_CONFIANZA = 0.7;

const NOMBRES_CANAL = { CALL_CENTER: 'Call center (transcripción)', WHATSAPP: 'WhatsApp', REDES_SOCIALES: 'Redes sociales' };

/** Arma el mensaje que reciben los agentes. Solo contiene texto ya tokenizado. */
export function armarSolicitud({ canal, protegida, tono }) {
  const a3 = [
    protegida.resumen && `Resumen: ${protegida.resumen}`,
    tono && `Tono del cliente: ${tono}`,
    protegida.datos.length > 0 && `Datos extraídos: ${protegida.datos.map(([k, v]) => `${k} = ${v}`).join('; ')}`,
  ].filter(Boolean);
  const apoyo = a3.length ? `\n\nSalida de "Identificar la solicitud" (A3), como apoyo:\n${a3.join('\n')}` : '';
  return `Canal: ${NOMBRES_CANAL[canal] ?? canal}\nSolicitud del cliente:\n"""${protegida.texto}"""${apoyo}`;
}

const redondear = (x) => Math.round(x * 100) / 100;

/**
 * Combina lo que dijeron los agentes con el motor de reglas. Función pura: no llama al modelo.
 * - Si el motor de reglas ve fraude y el detector no, prevalece la regla.
 * - El caso va al asesor si es complejo, si el validador lo pide o si la confianza es baja.
 */
export function combinar({ id_caso, clasificador: c, detector: d, validador: v, reglas }) {
  let tipo = d.tipo_caso_complejo === 'ninguno' ? null : d.tipo_caso_complejo;
  let area = d.area_sugerida === 'Ninguna' ? null : d.area_sugerida;
  const regla_prevalece = reglas.posible_fraude && tipo !== 'fraude';
  if (regla_prevalece) {
    tipo = 'fraude';
    area = 'Riesgo';
  }
  const es_caso_complejo = tipo !== null;

  return {
    salida: {
      id_caso,
      categoria_sugerida: { codigo: c.categoria_codigo, nombre: nombreDe(c.categoria_codigo) },
      alternativas: c.alternativas
        .filter((a) => a.codigo !== c.categoria_codigo)
        .slice(0, 2)
        .map((a) => ({ codigo: a.codigo, nombre: nombreDe(a.codigo), confianza: redondear(a.confianza) })),
      es_caso_complejo,
      tipo_caso_complejo: tipo,
      area_sugerida: area,
      justificacion: c.justificacion,
      confianza: redondear(v.confianza_final),
    },
    requiere_asesor:
      es_caso_complejo || v.requiere_revision || !v.categoria_valida || v.confianza_final < UMBRAL_CONFIANZA,
    regla_prevalece,
  };
}

/**
 * Crea la función `categorizar` a partir de una función que llama a un agente.
 * @param {(agente: 'clasificador'|'detector'|'validador', contenido: string) => Promise<{datos: object, ms: number, tokens: {entrada: number, salida: number}}>} llamarAgente
 */
export function crearCategorizador(llamarAgente) {
  return async function categorizar({ id_caso, canal, texto, resumen = '', tono = '', datos = [] }) {
    const protegida = protegerSolicitud({ texto, resumen, datos });
    if (protegida.bloqueado) {
      return {
        bloqueado: true,
        motivo: 'El Privacy Vault encontró un dato numérico que no pudo reemplazar. La solicitud no se envió al modelo.',
        texto_protegido: protegida.texto,
      };
    }

    const solicitud = armarSolicitud({ canal, protegida, tono });
    const reglas = evaluarReglas(protegida.texto);
    const [clasificador, detector] = await Promise.all([
      llamarAgente('clasificador', solicitud),
      llamarAgente('detector', solicitud),
    ]);
    const validador = await llamarAgente(
      'validador',
      `${solicitud}\n\nPropuesta del clasificador:\n${JSON.stringify(clasificador.datos, null, 2)}\n\nPropuesta del detector:\n${JSON.stringify(detector.datos, null, 2)}`,
    );

    const { salida, requiere_asesor, regla_prevalece } = combinar({
      id_caso,
      clasificador: clasificador.datos,
      detector: detector.datos,
      validador: validador.datos,
      reglas,
    });
    const agentes = { clasificador, detector, validador };

    return {
      bloqueado: false,
      salida,
      requiere_asesor,
      texto_protegido: protegida.texto,
      datos_protegidos: protegida.contador,
      reglas: { ...reglas, regla_prevalece },
      agentes: Object.fromEntries(Object.entries(agentes).map(([k, a]) => [k, { ...a.datos, ms: a.ms }])),
      tokens: Object.values(agentes).reduce(
        (t, a) => ({ entrada: t.entrada + a.tokens.entrada, salida: t.salida + a.tokens.salida }),
        { entrada: 0, salida: 0 },
      ),
    };
  };
}
