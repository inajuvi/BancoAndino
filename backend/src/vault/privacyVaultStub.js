import { AppError } from '../errors.js';

// SIMULACIÓN del Privacy Vault (la versión real es la HU-03).
// Solo fija la interfaz `tokenizar` y enmascara patrones obvios con expresiones regulares;
// NO detecta nombres. No guarda ningún mapa de tokens: el texto original no se persiste.
// El orden importa: lo más específico primero.
const PATRONES = [
  ['CORREO', /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g],
  ['TARJETA', /\b(?:\d[ -]?){13,16}\b/g],
  ['TELEFONO', /\b3\d{9}\b/g],
  ['CEDULA_O_CUENTA', /\b\d{6,12}\b/g],
];

function enmascarar(texto) {
  const contadores = {};
  let resultado = texto;
  for (const [tipo, patron] of PATRONES) {
    resultado = resultado.replace(patron, () => {
      contadores[tipo] = (contadores[tipo] ?? 0) + 1;
      return `[[${tipo}_${contadores[tipo]}]]`;
    });
  }
  return resultado;
}

export function createPrivacyVaultStub() {
  return {
    // Recibe { texto, resumen, datos_extraidos } y devuelve la versión tokenizada.
    async tokenizar({ texto, resumen = '', datos_extraidos = {} }) {
      try {
        return {
          texto_tokenizado: enmascarar(texto),
          resumen_tokenizado: enmascarar(resumen),
          datos_extraidos_tokenizados: Object.fromEntries(
            Object.entries(datos_extraidos).map(([clave, valor]) => [clave, enmascarar(valor)]),
          ),
        };
      } catch {
        // Fail-closed: si el vault falla, no se guarda nada.
        throw new AppError(503, 'PRIVACY_VAULT_NO_DISPONIBLE', 'No fue posible proteger los datos personales.');
      }
    },
  };
}
