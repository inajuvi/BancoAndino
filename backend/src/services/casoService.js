import { randomUUID } from 'node:crypto';
import { sha256 } from '../utils/hash.js';

// Lógica de negocio de HU-01. Recibe sus dependencias por parámetro (fáciles de simular).
export function createCasoService({ repository, vault, audit }) {
  // CA-5: el id_caso ya existe -> se devuelve el caso existente y se audita el intento.
  async function responderDuplicado(existente, usuario) {
    await audit.append({
      tipo: 'SOLICITUD_DUPLICADA',
      trace_id: existente.trace_id,
      id_caso: existente.id_caso,
      canal: existente.canal,
      hash_texto: existente.hash_texto_original,
      id_asesor: usuario.id,
    });
    return { caso: existente, creado: false };
  }

  async function registrar({ datos, usuario }) {
    const { id_caso, canal, texto_cliente, salida_a3 } = datos;

    const existente = await repository.findByIdCaso(id_caso);
    if (existente) return responderDuplicado(existente, usuario);

    // CA-6: el texto original solo pasa por el Privacy Vault; en base solo queda su huella.
    const tokenizado = await vault.tokenizar({
      texto: texto_cliente,
      resumen: salida_a3.resumen,
      datos_extraidos: salida_a3.datos_extraidos,
    });

    const caso = {
      id_caso,
      trace_id: randomUUID(),
      canal,
      texto_tokenizado: tokenizado.texto_tokenizado,
      resumen_tokenizado: tokenizado.resumen_tokenizado,
      tono_cliente: salida_a3.tono ?? null,
      datos_extraidos_tokenizados: tokenizado.datos_extraidos_tokenizados,
      hash_texto_original: sha256(texto_cliente),
      estado: 'RECIBIDO',
      fecha_recepcion: new Date().toISOString(),
    };

    try {
      await repository.create(caso);
    } catch (error) {
      // Dos peticiones simultáneas con el mismo id_caso: gana la primera, la otra es duplicado.
      if (error.code === 'DUPLICATE') {
        return responderDuplicado(await repository.findByIdCaso(id_caso), usuario);
      }
      throw error;
    }

    // CA-7: evento sin datos personales (solo identificadores, canal y huella).
    await audit.append({
      tipo: 'CASO_RECIBIDO',
      trace_id: caso.trace_id,
      id_caso: caso.id_caso,
      canal: caso.canal,
      hash_texto: caso.hash_texto_original,
      id_asesor: usuario.id,
    });

    return { caso, creado: true };
  }

  return { registrar };
}
