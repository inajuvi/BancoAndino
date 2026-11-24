import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarReglas } from '../src/reglas.js';

const ids = (texto) => evaluarReglas(texto).reglas_activadas.map((r) => r.id);

test('R1: el cliente no reconoce un movimiento', () => {
  assert.deepEqual(ids('hoy veo una compra que yo no hice'), ['R1']);
  assert.deepEqual(ids('tengo un cobro que no reconozco'), ['R1']);
});

test('R2: menciona robo, clonación o fraude', () => {
  assert.deepEqual(ids('creo que me clonaron la tarjeta'), ['R2']);
});

test('R3: le pidieron claves o códigos', () => {
  assert.deepEqual(ids('me llamaron y me pidieron el código que me llegó'), ['R3']);
});

test('R4: enlace que pide actualizar datos, aunque el cliente no diga "sospechoso"', () => {
  assert.deepEqual(ids('me escribieron que tenía que actualizar mis datos en un link'), ['R4']);
  assert.deepEqual(ids('me mandaron un link para actualizar mis datos'), ['R4']);
  assert.deepEqual(ids('me llegó un correo raro del banco'), ['R4']);
});

test('varias señales activan varias reglas', () => {
  const r = evaluarReglas('me pidieron el código y hoy veo transferencias que yo no hice');
  assert.equal(r.posible_fraude, true);
  assert.deepEqual(r.reglas_activadas.map((x) => x.id), ['R1', 'R3']);
});

test('sin señales no hay posible fraude', () => {
  assert.deepEqual(evaluarReglas('necesito un certificado bancario'), { posible_fraude: false, reglas_activadas: [] });
});
