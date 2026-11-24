import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLlamadaAgente, ErrorDelModelo, ESQUEMAS } from '../src/agentes.js';

function clienteFalso(respuesta) {
  const peticiones = [];
  return {
    peticiones,
    beta: { messages: { create: async (p) => (peticiones.push(p), respuesta) } },
  };
}

const respuestaOk = (texto) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: texto }],
  usage: { input_tokens: 120, output_tokens: 30 },
});

test('pide salida con el esquema del agente y devuelve el JSON, el tiempo y los tokens', async () => {
  const cliente = clienteFalso(respuestaOk('{"categoria_valida":true}'));
  const r = await crearLlamadaAgente(cliente, 'claude-haiku-5-5')('validador', 'hola');
  assert.deepEqual(r.datos, { categoria_valida: true });
  assert.deepEqual(r.tokens, { entrada: 120, salida: 30 });
  assert.equal(typeof r.ms, 'number');

  const [p] = cliente.peticiones;
  assert.equal(p.model, 'claude-haiku-5-5');
  assert.deepEqual(p.output_config.format, { type: 'json_schema', schema: ESQUEMAS.validador });
  assert.equal(p.fallbacks, undefined, 'Haiku no usa respaldo del servidor');
});

test('activa el respaldo del servidor en modelos Opus', async () => {
  const cliente = clienteFalso(respuestaOk('{}'));
  await crearLlamadaAgente(cliente, 'claude-opus-5-5')('detector', 'hola');
  assert.equal(cliente.peticiones[0].fallbacks, 'default');
  assert.deepEqual(cliente.peticiones[0].betas, ['server-side-fallback-2026-07-01']);
});

test('convierte negativas, respuestas truncadas y JSON inválido en ErrorDelModelo', async () => {
  const casos = [
    { stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [], usage: {} },
    { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"a":' }], usage: {} },
    { stop_reason: 'end_turn', content: [], usage: {} },
    respuestaOk('no es json'),
  ];
  for (const respuesta of casos) {
    await assert.rejects(crearLlamadaAgente(clienteFalso(respuesta), 'claude-haiku-5-5')('clasificador', 'x'), ErrorDelModelo);
  }
});
