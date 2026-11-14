import { createHash } from 'node:crypto';

// Huella SHA-256 (hex, 64 caracteres) del texto normalizado.
export const sha256 = (texto) =>
  createHash('sha256').update(texto.normalize('NFC'), 'utf8').digest('hex');
