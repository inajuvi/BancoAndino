import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { crearApp } from '../src/app.js';
import { ErrorDelModelo } from '../src/agentes.js';

const valida = { id_caso: 'CASO-0001', canal: 'WHATSAPP', texto: 'Necesito un certificado' };
let servidor;
let base;
let comportamiento = async () => ({ bloqueado: false, salida: { id_caso: 'CASO-0001' } });
const recibido = [];
const errores = [];

before(async () => {
  const app = crearApp({
    categorizar: async (entrada) => (recibido.push(entrada), comportamiento(entrada)),
    modelo: 'modelo-de-prueba',
    limitePorMinuto: 1000,
    registrarError: (e) => errores.push(e),
  });
  await new Promise((ok) => { servidor = app.listen(0, '127.0.0.1', ok); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const enviar = (cuerpo, tipo = 'application/json') =>
  fetch(`${base}/api/categorizar`, { method: 'POST', headers: { 'Content-Type': tipo }, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) });

test('/api/info solo expone el modelo', async () => {
  const r = await fetch(`${base}/api/info`);
  assert.deepEqual(await r.json(), { modelo: 'modelo-de-prueba' });
});

test('envía cabeceras de seguridad y no revela la tecnología del servidor', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('una solicitud válida llega al orquestador con los valores por defecto', async () => {
  recibido.length = 0;
  const r = await enviar(valida);
  assert.equal(r.status, 200);
  assert.equal(typeof (await r.json()).ms_total, 'number');
  assert.deepEqual(recibido[0], { ...valida, resumen: '', tono: '', datos: [] });
});

test('rechaza entradas inválidas e indica los campos', async () => {
  const casos = [
    [{ ...valida, texto: '   ' }, 'texto'],
    [{ ...valida, canal: 'TELEGRAM' }, 'canal'],
    [{ ...valida, id_caso: '<script>' }, 'id_caso'],
    [{ ...valida, tono: 'Feliz' }, 'tono'],
    [{ ...valida, texto: 'x'.repeat(5001) }, 'texto'],
    [{ ...valida, datos: [['solo-clave']] }, 'datos.0'],
    [{ ...valida, extra: 1 }, '(cuerpo)'],
  ];
  for (const [cuerpo, campo] of casos) {
    const r = await enviar(cuerpo);
    assert.equal(r.status, 400, campo);
    assert.ok((await r.json()).campos.includes(campo), campo);
  }
});

test('responde 400 ante JSON mal formado y 413 ante un cuerpo demasiado grande', async () => {
  assert.equal((await enviar('{"id_caso":')).status, 400);
  const grande = await enviar({ ...valida, texto: 'x'.repeat(25_000) });
  assert.equal(grande.status, 413);
});

test('traduce los errores del modelo sin exponer detalles internos', async () => {
  const casos = [
    [new ErrorDelModelo('El modelo declinó la solicitud (cyber).'), 502, 'El modelo declinó la solicitud (cyber).'],
    [new Anthropic.RateLimitError(429, {}, 'limit', new Headers()), 429, null],
    [new Anthropic.AuthenticationError(401, {}, 'auth', new Headers()), 503, null],
    [new Error('detalle interno /ruta/secreta'), 500, 'Error interno. Intenta de nuevo.'],
  ];
  for (const [error, estado, mensaje] of casos) {
    comportamiento = async () => { throw error; };
    const r = await enviar(valida);
    const cuerpo = await r.json();
    assert.equal(r.status, estado);
    if (mensaje) assert.equal(cuerpo.error, mensaje);
    assert.doesNotMatch(cuerpo.error, /ruta\/secreta/);
  }
  assert.equal(errores.length, 1, 'solo el error desconocido se registra');
});

test('limita la cantidad de solicitudes por minuto', async () => {
  const app = crearApp({ categorizar: async () => ({}), modelo: 'm', limitePorMinuto: 2, registrarError: () => {} });
  const srv = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  const url = `http://127.0.0.1:${srv.address().port}/api/categorizar`;
  const estados = [];
  for (let i = 0; i < 3; i += 1) {
    estados.push((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valida) })).status);
  }
  srv.close();
  assert.deepEqual(estados, [200, 200, 429]);
});
