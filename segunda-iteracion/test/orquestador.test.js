import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarSolicitud, combinar, crearCategorizador } from '../src/orquestador.js';

const clasificador = {
  categoria_codigo: 'CNR',
  confianza: 0.93,
  alternativas: [
    { codigo: 'CNR', confianza: 0.9 },
    { codigo: 'BLQ', confianza: 0.051 },
    { codigo: 'SUP', confianza: 0.02 },
  ],
  justificacion: 'El cliente no reconoce la compra.',
};
const detectorFraude = { es_caso_complejo: true, tipo_caso_complejo: 'fraude', area_sugerida: 'Riesgo', senales: [] };
const detectorNinguno = { es_caso_complejo: false, tipo_caso_complejo: 'ninguno', area_sugerida: 'Ninguna', senales: [] };
const validadorOk = { categoria_valida: true, confianza_final: 0.924, requiere_revision: false, observacion: 'ok' };
const sinReglas = { posible_fraude: false, reglas_activadas: [] };
const conReglas = { posible_fraude: true, reglas_activadas: [{ id: 'R1', descripcion: 'x' }] };

test('combinar arma el JSON de A4 y quita la sugerida de las alternativas', () => {
  const { salida } = combinar({ id_caso: 'CASO-1', clasificador, detector: detectorFraude, validador: validadorOk, reglas: sinReglas });
  assert.deepEqual(salida, {
    id_caso: 'CASO-1',
    categoria_sugerida: { codigo: 'CNR', nombre: 'Cobro o compra no reconocida' },
    alternativas: [
      { codigo: 'BLQ', nombre: 'Bloqueo de tarjeta por pérdida o robo', confianza: 0.05 },
      { codigo: 'SUP', nombre: 'Suplantación o mensaje sospechoso (phishing)', confianza: 0.02 },
    ],
    es_caso_complejo: true,
    tipo_caso_complejo: 'fraude',
    area_sugerida: 'Riesgo',
    justificacion: 'El cliente no reconoce la compra.',
    confianza: 0.92,
  });
});

test('si el motor de reglas ve fraude y el detector no, prevalece la regla', () => {
  const r = combinar({ id_caso: 'X', clasificador, detector: detectorNinguno, validador: validadorOk, reglas: conReglas });
  assert.equal(r.regla_prevalece, true);
  assert.equal(r.salida.tipo_caso_complejo, 'fraude');
  assert.equal(r.salida.area_sugerida, 'Riesgo');
  assert.equal(r.requiere_asesor, true);
});

test('un caso normal con alta confianza no requiere asesor', () => {
  const r = combinar({ id_caso: 'X', clasificador, detector: detectorNinguno, validador: validadorOk, reglas: sinReglas });
  assert.equal(r.salida.es_caso_complejo, false);
  assert.equal(r.salida.area_sugerida, null);
  assert.equal(r.requiere_asesor, false);
});

test('la baja confianza o la observación del validador envían el caso al asesor', () => {
  const base = { id_caso: 'X', clasificador, detector: detectorNinguno, reglas: sinReglas };
  assert.equal(combinar({ ...base, validador: { ...validadorOk, confianza_final: 0.69 } }).requiere_asesor, true);
  assert.equal(combinar({ ...base, validador: { ...validadorOk, requiere_revision: true } }).requiere_asesor, true);
  assert.equal(combinar({ ...base, validador: { ...validadorOk, categoria_valida: false } }).requiere_asesor, true);
});

test('armarSolicitud incluye la salida de A3 solo cuando existe', () => {
  const sin = armarSolicitud({ canal: 'WHATSAPP', protegida: { texto: 'hola', resumen: '', datos: [] }, tono: '' });
  assert.equal(sin, 'Canal: WhatsApp\nSolicitud del cliente:\n"""hola"""');
  const con = armarSolicitud({ canal: 'CALL_CENTER', protegida: { texto: 'hola', resumen: 'r', datos: [['monto', '5']] }, tono: 'Urgente' });
  assert.match(con, /Resumen: r\nTono del cliente: Urgente\nDatos extraídos: monto = 5$/);
});

function agentesFalsos() {
  const llamadas = [];
  const respuestas = { clasificador, detector: detectorFraude, validador: validadorOk };
  const llamarAgente = async (agente, contenido) => {
    llamadas.push({ agente, contenido });
    return { datos: respuestas[agente], ms: 10, tokens: { entrada: 100, salida: 20 } };
  };
  return { llamadas, llamarAgente };
}

test('categorizar solo envía texto tokenizado a los agentes y suma los tokens', async () => {
  const { llamadas, llamarAgente } = agentesFalsos();
  const r = await crearCategorizador(llamarAgente)({
    id_caso: 'CASO-1',
    canal: 'WHATSAPP',
    texto: 'Me llamo Ana Pérez, celular 310 555 1234, hay una compra que yo no hice',
    resumen: 'correo ana@x.co',
  });
  assert.deepEqual(llamadas.map((l) => l.agente), ['clasificador', 'detector', 'validador']);
  for (const { contenido } of llamadas) assert.doesNotMatch(contenido, /Ana Pérez|310 555 1234|ana@x\.co/);
  assert.match(llamadas[2].contenido, /Propuesta del clasificador/);
  assert.equal(r.bloqueado, false);
  assert.deepEqual(r.datos_protegidos, { TELEFONO: 1, NOMBRE: 1, CORREO: 1 });
  assert.equal(r.reglas.posible_fraude, true);
  assert.deepEqual(r.tokens, { entrada: 300, salida: 60 });
  assert.equal(r.agentes.validador.ms, 10);
});

test('categorizar no llama al modelo si el Privacy Vault bloquea el envío', async () => {
  const { llamadas, llamarAgente } = agentesFalsos();
  const r = await crearCategorizador(llamarAgente)({ id_caso: 'X', canal: 'WHATSAPP', texto: 'el número es 12 34 56 78 90' });
  assert.equal(r.bloqueado, true);
  assert.equal(llamadas.length, 0);
});
