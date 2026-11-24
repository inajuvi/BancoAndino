// Cálculo de las mediciones de la Tabla 2 del Hito 1 a partir de los resultados de la prueba.

/** US$ por millón de tokens (entrada, salida). */
const PRECIOS = Object.freeze({ 'claude-opus-5-5': [4, 20], 'claude-haiku-5-5': [0.1, 0.5] });
const TRM = 4100;

/**
 * Compara un resultado del sistema con lo esperado para un mensaje de prueba.
 * @param {{ id: string, esperado: string, complejo: string|null }} mensaje
 */
export function evaluarFila(mensaje, resultado) {
  const s = resultado.salida;
  const opciones = [s.categoria_sugerida.codigo, ...s.alternativas.map((a) => a.codigo)];
  return {
    id: mensaje.id,
    esperado: mensaje.esperado,
    sugerida: s.categoria_sugerida.codigo,
    acierto: s.categoria_sugerida.codigo === mensaje.esperado,
    en_alternativas: opciones.includes(mensaje.esperado),
    complejo_esperado: mensaje.complejo,
    complejo_detectado: s.tipo_caso_complejo,
    requiere_asesor: resultado.requiere_asesor,
    tokens: resultado.tokens,
  };
}

const proporcion = (parte, total) => (total === 0 ? null : parte / total);

/** Agrega las filas en las mediciones de la prueba y el costo estimado del modelo. */
export function calcularMetricas(filas, modelo) {
  const complejos = filas.filter((f) => f.complejo_esperado);
  const fraudes = filas.filter((f) => f.complejo_esperado === 'fraude');
  const errores = filas.filter((f) => !f.acierto);
  const tokens = filas.reduce(
    (t, f) => ({ entrada: t.entrada + f.tokens.entrada, salida: t.salida + f.tokens.salida }),
    { entrada: 0, salida: 0 },
  );
  const [precioEntrada, precioSalida] = PRECIOS[modelo] ?? [NaN, NaN];
  const costoUsd = (tokens.entrada * precioEntrada + tokens.salida * precioSalida) / 1e6;

  return {
    modelo,
    mensajes: filas.length,
    acierto_sugerida: proporcion(filas.filter((f) => f.acierto).length, filas.length),
    acierto_entre_alternativas: proporcion(filas.filter((f) => f.en_alternativas).length, filas.length),
    deteccion_casos_complejos: proporcion(complejos.filter((f) => f.complejo_detectado !== null).length, complejos.length),
    deteccion_fraudes: proporcion(fraudes.filter((f) => f.complejo_detectado === 'fraude').length, fraudes.length),
    errores_enviados_al_asesor: proporcion(errores.filter((f) => f.requiere_asesor).length, errores.length),
    falsas_alarmas: filas.filter((f) => !f.complejo_esperado && f.complejo_detectado).length,
    tokens,
    costo_usd_total: costoUsd,
    costo_cop_por_solicitud: filas.length ? (costoUsd * TRM) / filas.length : null,
  };
}
