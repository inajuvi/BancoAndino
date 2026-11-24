// Motor de reglas antifraude: no depende del modelo. Si encuentra una señal de fraude,
// el caso se marca como posible fraude aunque el detector diga lo contrario.

const REGLAS = Object.freeze([
  {
    id: 'R1',
    descripcion: 'El cliente no reconoce un cobro, una compra o una transferencia',
    re: /\bno (?:reconozco|reconoce|hice|realic[ée]|autoric[ée])\b|\bdesconozco\b|\byo no (?:hice|compr[ée]|autoric[ée])\b/i,
  },
  {
    id: 'R2',
    descripcion: 'Menciona robo, clonación o fraude',
    re: /\b(?:fraude|estafa|robaron|robo|clonad[ao]s?|clonaron|hurto)\b/i,
  },
  {
    id: 'R3',
    descripcion: 'Le pidieron claves o códigos por mensaje o llamada',
    re: /\b(?:pidi[óo]|pidieron|solicit[óo]|solicitaron)\b.{0,60}\b(?:clave|c[óo]digo|token|contrase[ñn]a|pin)\b/i,
  },
  {
    id: 'R4',
    descripcion: 'Enlace o mensaje a nombre del banco que pide datos o parece falso',
    re: /\b(?:link|enlace)\b.{0,60}\b(?:actualizar|verificar|datos|clave)\b|\b(?:actualizar|verificar)\b.{0,60}\b(?:link|enlace)\b|\b(?:link|enlace|mensaje|correo|sms)\b.{0,40}\b(?:sospechos[oa]|raro|extra[ñn]o|falso)\b/i,
  },
]);

/** @returns {{ posible_fraude: boolean, reglas_activadas: Array<{id: string, descripcion: string}> }} */
export function evaluarReglas(texto) {
  const reglas_activadas = REGLAS.filter((r) => r.re.test(texto)).map(({ id, descripcion }) => ({ id, descripcion }));
  return { posible_fraude: reglas_activadas.length > 0, reglas_activadas };
}
