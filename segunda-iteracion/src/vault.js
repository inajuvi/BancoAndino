// Privacy Vault: reemplaza los datos personales por tokens ANTES de llamar al modelo.
// Frente al Taller 2 reconoce teléfonos y tarjetas escritos con espacios o guiones, y bloquea el
// envío si después de tokenizar todavía queda una secuencia larga de dígitos (control de cierre).
// En esta PoC los valores originales no se guardan: el modelo nunca los necesita para categorizar.

const PATRONES = [
  { tipo: 'CORREO', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  // Tarjeta: 13 a 19 dígitos, con o sin espacios o guiones
  { tipo: 'TARJETA', re: /\b(?:\d[ -]?){12,18}\d\b/g },
  // Celular colombiano: 3xx xxx xxxx, con o sin espacios, guiones o +57
  { tipo: 'TELEFONO', re: /(?:\+?57[ -]?)?\b3\d{2}[ -]?\d{3}[ -]?\d{4}\b/g },
  // Cédula o cuenta anunciada ("cédula 1.023.456.789", "cuenta No. 0123-4567-89")
  { tipo: 'DOCUMENTO', re: /(?<=\b(?:c[ée]dula|cc|documento|cuenta)(?:\s+(?:es|de|n[úu]mero|no\.?|#))*\s*:?\s*)\d[\d. -]{4,16}\d/gi },
  // Cualquier otra secuencia de 8 a 12 dígitos (los montos de 6 o 7 cifras se conservan)
  { tipo: 'DOCUMENTO', re: /\b\d{8,12}\b/g },
  // Nombre propio después de "me llamo", "mi nombre es", "soy" o "habla"
  { tipo: 'NOMBRE', re: /(?<=\b(?:[Mm]e llamo|[Mm]i nombre es|[Ss]oy|[Hh]abla)\s)[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}/g },
];

const TOKEN = /\[[A-Z]+_\d+\]/g;
const DIGITOS_RESIDUALES = /\d{8,}/;

/**
 * Tokeniza un texto. `contador` se comparte entre los campos de una misma solicitud para que
 * los tokens no se repitan ([TELEFONO_1] en el texto y [TELEFONO_2] en el resumen).
 * @returns {{ protegido: string, bloqueado: boolean }}
 */
export function tokenizar(texto, contador = {}) {
  let protegido = texto;
  for (const { tipo, re } of PATRONES) {
    protegido = protegido.replace(re, () => {
      contador[tipo] = (contador[tipo] ?? 0) + 1;
      return `[${tipo}_${contador[tipo]}]`;
    });
  }
  // Une los dígitos separados por espacio o guion ("12 34 56 78") antes de buscar residuos.
  const sinTokens = protegido.replace(TOKEN, ' ').replace(/(\d)[ -](?=\d)/g, '$1');
  return { protegido, bloqueado: DIGITOS_RESIDUALES.test(sinTokens) };
}

/**
 * Protege todos los campos de una solicitud con un contador común.
 * @returns {{ texto: string, resumen: string, datos: Array<[string, string]>, contador: object, bloqueado: boolean }}
 */
export function protegerSolicitud({ texto, resumen = '', datos = [] }) {
  const contador = {};
  const t = tokenizar(texto, contador);
  const r = tokenizar(resumen, contador);
  const d = datos.map(([clave, valor]) => [clave, tokenizar(valor, contador)]);
  return {
    texto: t.protegido,
    resumen: r.protegido,
    datos: d.map(([clave, v]) => [clave, v.protegido]),
    contador,
    bloqueado: t.bloqueado || r.bloqueado || d.some(([, v]) => v.bloqueado),
  };
}
