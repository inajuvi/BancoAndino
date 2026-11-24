import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizar, protegerSolicitud } from '../src/vault.js';

test('tokeniza correo, tarjeta, celular y nombre', () => {
  const { protegido, bloqueado } = tokenizar(
    'Me llamo Carolina Restrepo, mi tarjeta es 4512 3456 7890 1234, celular 310 555 1234 y correo ana.perez@gmail.com',
  );
  assert.equal(protegido, 'Me llamo [NOMBRE_1], mi tarjeta es [TARJETA_1], celular [TELEFONO_1] y correo [CORREO_1]');
  assert.equal(bloqueado, false);
});

test('reconoce el teléfono escrito con espacios, guiones o +57 (límite del Taller 2)', () => {
  for (const tel of ['3105551234', '310 555 1234', '310-555-1234', '+57 300-555-9876']) {
    assert.equal(tokenizar(`llámenme al ${tel}`).protegido, 'llámenme al [TELEFONO_1]', tel);
  }
});

test('tokeniza la cédula con puntos y el nombre después de "Soy" con mayúscula', () => {
  assert.equal(
    tokenizar('Soy Andrés Felipe Gómez, cédula 1.020.456.789.').protegido,
    'Soy [NOMBRE_1], cédula [DOCUMENTO_1].',
  );
});

test('conserva los montos de dinero', () => {
  const { protegido, bloqueado } = tokenizar('me cobraron $1.250.000 y luego 150000');
  assert.equal(protegido, 'me cobraron $1.250.000 y luego 150000');
  assert.equal(bloqueado, false);
});

test('bloquea el envío si queda una secuencia larga de dígitos sin reemplazar', () => {
  assert.equal(tokenizar('el número raro es 12 34 56 78 90').bloqueado, true);
});

test('no deja datos originales en la salida', () => {
  const salida = JSON.stringify(tokenizar('soy Ana, mi correo es ana@x.co y mi cel 3001234567'));
  assert.doesNotMatch(salida, /ana@x\.co|3001234567/);
});

test('protegerSolicitud usa un contador común y propaga el bloqueo de cualquier campo', () => {
  const p = protegerSolicitud({
    texto: 'mi celular es 3105551234',
    resumen: 'el cliente da otro celular 3009876543',
    datos: [['correo', 'ana@x.co']],
  });
  assert.equal(p.texto, 'mi celular es [TELEFONO_1]');
  assert.equal(p.resumen, 'el cliente da otro celular [TELEFONO_2]');
  assert.deepEqual(p.datos, [['correo', '[CORREO_1]']]);
  assert.deepEqual(p.contador, { TELEFONO: 2, CORREO: 1 });
  assert.equal(p.bloqueado, false);

  assert.equal(protegerSolicitud({ texto: 'hola', datos: [['ref', '12 34 56 78 90']] }).bloqueado, true);
});
