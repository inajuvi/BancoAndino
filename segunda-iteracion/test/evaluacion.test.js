import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarFila, calcularMetricas } from '../src/evaluacion.js';

const resultado = (codigo, alternativas, tipo, requiere_asesor = false) => ({
  salida: { categoria_sugerida: { codigo }, alternativas: alternativas.map((c) => ({ codigo: c })), tipo_caso_complejo: tipo },
  requiere_asesor,
  tokens: { entrada: 1_000_000, salida: 100_000 },
});

test('evaluarFila marca el acierto y si la correcta quedó entre las alternativas', () => {
  const f = evaluarFila({ id: 'M1', esperado: 'DOB', complejo: 'conciliacion' }, resultado('PAG', ['DOB', 'EXT'], 'conciliacion', true));
  assert.equal(f.acierto, false);
  assert.equal(f.en_alternativas, true);
  assert.equal(f.complejo_detectado, 'conciliacion');
});

test('calcularMetricas reproduce las mediciones de la Tabla 2 y el costo', () => {
  const filas = [
    evaluarFila({ id: '1', esperado: 'CNR', complejo: 'fraude' }, resultado('CNR', ['BLQ', 'SUP'], 'fraude')),
    evaluarFila({ id: '2', esperado: 'DOB', complejo: 'conciliacion' }, resultado('PAG', ['DOB', 'EXT'], 'conciliacion', true)),
    evaluarFila({ id: '3', esperado: 'CER', complejo: null }, resultado('CER', ['EXT', 'OTR'], null)),
    evaluarFila({ id: '4', esperado: 'EXT', complejo: null }, resultado('EXT', ['PAG', 'OTR'], 'conciliacion')),
  ];
  const m = calcularMetricas(filas, 'claude-haiku-5-5');
  assert.equal(m.acierto_sugerida, 0.75);
  assert.equal(m.acierto_entre_alternativas, 1);
  assert.equal(m.deteccion_casos_complejos, 1);
  assert.equal(m.deteccion_fraudes, 1);
  assert.equal(m.errores_enviados_al_asesor, 1);
  assert.equal(m.falsas_alarmas, 1);
  // 4 M de entrada a US$0,10 + 0,4 M de salida a US$0,50 = US$0,60
  assert.ok(Math.abs(m.costo_usd_total - 0.6) < 1e-9);
  assert.ok(Math.abs(m.costo_cop_por_solicitud - 615) < 1e-9);
});

test('sin casos de un tipo, la medición queda en null en vez de dividir por cero', () => {
  const m = calcularMetricas([evaluarFila({ id: '1', esperado: 'CER', complejo: null }, resultado('CER', [], null))], 'claude-haiku-5-5');
  assert.equal(m.deteccion_fraudes, null);
  assert.equal(m.errores_enviados_al_asesor, null);
});
