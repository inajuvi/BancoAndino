import { sha256 } from '../utils/hash.js';

// SIMULACIÓN de la bitácora de auditoría (la versión real, en S3 con Object Lock, es la HU-13).
// Interfaz: solo se puede añadir. Cada evento queda congelado y encadenado por hash al anterior.
export function createAuditLogStub() {
  const eventos = [];
  let hashPrevio = 'GENESIS';

  return {
    async append(evento) {
      const base = { ...evento, fecha_hora: new Date().toISOString(), hash_previo: hashPrevio };
      const completo = Object.freeze({ ...base, hash_evento: sha256(JSON.stringify(base)) });
      hashPrevio = completo.hash_evento;
      eventos.push(completo);
      return completo;
    },
    // Solo para pruebas: copia de lectura.
    snapshot: () => eventos.map((e) => ({ ...e })),
  };
}
