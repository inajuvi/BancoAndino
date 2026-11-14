// Una prueba (o más) por criterio de aceptación de la HU-01 (BA-109).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createAuditLogStub } from '../src/audit/auditLogStub.js';
import { createCasoRepositoryMemory } from '../src/repositories/casoRepositoryMemory.js';
import { createPrivacyVaultStub } from '../src/vault/privacyVaultStub.js';
import { sha256 } from '../src/utils/hash.js';

const config = loadConfig({ JWT_SECRET: 'secreto-de-pruebas-123', MAX_TEXT_LENGTH: '100', RATE_LIMIT_MAX: '1000' });
const token = (rol) => jwt.sign({ rol }, config.jwtSecret, { subject: 'asesor-1', expiresIn: '1h' });

let server, base, repository, audit;

before(async () => {
  repository = createCasoRepositoryMemory();
  audit = createAuditLogStub();
  const app = createApp({ config, repository, vault: createPrivacyVaultStub(), audit });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const post = (body, { auth = `Bearer ${token('asesor')}`, raw } = {}) =>
  fetch(`${base}/casos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: raw ?? JSON.stringify(body),
  });

const valido = (extra = {}) => ({
  id_caso: 'CASO-0001',
  canal: 'WHATSAPP',
  texto_cliente: 'Me cobraron algo que no reconozco.',
  ...extra,
});

let n = 0;
beforeEach(() => { n += 1; });
const unico = (extra) => valido({ id_caso: `CASO-T${n}`, ...extra });

test('CA-1: registra el caso en estado RECIBIDO con trace_id', async () => {
  const res = await post(unico());
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.equal(json.estado, 'RECIBIDO');
  assert.match(json.trace_id, /^[0-9a-f-]{36}$/);
  assert.equal(json.ya_existia, false);
  assert.ok(json.fecha_recepcion);
});

test('CA-2: sin id_caso, canal o texto responde 400 e indica el campo', async () => {
  for (const campo of ['id_caso', 'canal', 'texto_cliente']) {
    const cuerpo = unico();
    delete cuerpo[campo];
    const res = await post(cuerpo);
    assert.equal(res.status, 400, campo);
    const { error } = await res.json();
    assert.ok(error.campos.some((c) => c.campo === campo), `falta señalar ${campo}`);
  }
});

test('CA-2: texto solo con espacios también se rechaza', async () => {
  const res = await post(unico({ texto_cliente: '   ' }));
  assert.equal(res.status, 400);
});

test('CA-3: un canal no permitido se rechaza', async () => {
  const res = await post(unico({ canal: 'EMAIL' }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.campos[0].campo, 'canal');
});

test('CA-4: un texto sobre el límite configurado se rechaza e informa el límite', async () => {
  const res = await post(unico({ texto_cliente: 'a'.repeat(101) }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error.message, /100/);
});

test('CA-5: un id_caso repetido devuelve el existente y audita SOLICITUD_DUPLICADA', async () => {
  const cuerpo = unico();
  const primero = await (await post(cuerpo)).json();
  const res = await post(cuerpo);
  assert.equal(res.status, 200);
  const segundo = await res.json();
  assert.equal(segundo.trace_id, primero.trace_id);
  assert.equal(segundo.ya_existia, true);
  assert.ok(audit.snapshot().some((e) => e.tipo === 'SOLICITUD_DUPLICADA' && e.id_caso === cuerpo.id_caso));
  assert.equal(repository.snapshot().filter((c) => c.id_caso === cuerpo.id_caso).length, 1);
});

test('CA-5: dos peticiones simultáneas crean un solo caso', async () => {
  const cuerpo = unico();
  const [a, b] = await Promise.all([post(cuerpo), post(cuerpo)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
});

test('CA-6: la base no guarda el texto original, solo su hash', async () => {
  const original = 'Escríbanme a juan.perez@correo.com, mi cédula es 1020304050';
  const cuerpo = unico({ texto_cliente: original, salida_a3: { resumen: 'Cliente juan.perez@correo.com' } });
  assert.equal((await post(cuerpo)).status, 201);
  const guardado = repository.snapshot().find((c) => c.id_caso === cuerpo.id_caso);
  assert.equal(guardado.hash_texto_original, sha256(original));
  const volcado = JSON.stringify(guardado);
  assert.ok(!volcado.includes('juan.perez@correo.com'));
  assert.ok(!volcado.includes('1020304050'));
  assert.equal('texto_cliente' in guardado, false);
});

test('CA-7: la bitácora guarda CASO_RECIBIDO sin datos personales', async () => {
  const cuerpo = unico({ texto_cliente: 'Mi correo es ana@correo.com' });
  const { trace_id } = await (await post(cuerpo)).json();
  const evento = audit.snapshot().find((e) => e.tipo === 'CASO_RECIBIDO' && e.trace_id === trace_id);
  assert.ok(evento);
  assert.equal(evento.id_caso, cuerpo.id_caso);
  assert.equal(evento.canal, 'WHATSAPP');
  assert.equal(evento.hash_texto, sha256(cuerpo.texto_cliente));
  assert.ok(evento.fecha_hora);
  assert.ok(!JSON.stringify(evento).includes('ana@correo.com'));
});

test('CA-8: sin token responde 401', async () => {
  const res = await post(unico(), { auth: null });
  assert.equal(res.status, 401);
});

test('CA-8: token inválido responde 401', async () => {
  const res = await post(unico(), { auth: 'Bearer token-falso' });
  assert.equal(res.status, 401);
});

test('CA-8: un rol distinto de asesor responde 403 y no crea el caso', async () => {
  const cuerpo = unico();
  const res = await post(cuerpo, { auth: `Bearer ${token('auditor')}` });
  assert.equal(res.status, 403);
  assert.equal(repository.snapshot().some((c) => c.id_caso === cuerpo.id_caso), false);
});

test('rechaza campos desconocidos y JSON mal formado', async () => {
  assert.equal((await post(unico({ admin: true }))).status, 400);
  assert.equal((await post(null, { raw: '{no es json' })).status, 400);
});
