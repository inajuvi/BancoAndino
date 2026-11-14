// Validación en el cliente (solo UX). El backend siempre vuelve a validar.
import { CANALES, MAX_DATOS, MAX_ID_CASO, MAX_RESUMEN } from './constants.js';

export const VALORES_INICIALES = {
  id_caso: '',
  canal: '',
  texto_cliente: '',
  resumen: '',
  tono: '',
  datos: [], // [{ id, clave, valor }]
};

// Devuelve { campo: mensaje }; vacío si todo es válido.
export function validarFormulario(valores, { maxTexto }) {
  const errores = {};
  const idCaso = valores.id_caso.trim();
  const texto = valores.texto_cliente.trim();

  if (!idCaso) errores.id_caso = 'Ingresa el identificador del caso.';
  else if (idCaso.length > MAX_ID_CASO) errores.id_caso = `Máximo ${MAX_ID_CASO} caracteres.`;
  else if (!/^[A-Za-z0-9_-]+$/.test(idCaso)) {
    errores.id_caso = 'Usa solo letras, números, guion y guion bajo (sin espacios).';
  }

  if (!valores.canal) errores.canal = 'Selecciona el canal de atención.';
  else if (!CANALES.some((c) => c.valor === valores.canal)) errores.canal = 'Canal no válido.';

  if (!texto) errores.texto_cliente = 'Ingresa el texto o la transcripción del cliente.';
  else if (texto.length > maxTexto) errores.texto_cliente = `Supera el límite de ${maxTexto} caracteres.`;

  if (valores.resumen.length > MAX_RESUMEN) errores.resumen = `Máximo ${MAX_RESUMEN} caracteres.`;

  const filas = valores.datos.filter((f) => f.clave.trim() || f.valor.trim());
  const claves = filas.map((f) => f.clave.trim());
  if (filas.some((f) => !f.clave.trim() || !f.valor.trim())) {
    errores.datos_extraidos = 'Completa el nombre y el valor de cada dato, o elimina la fila.';
  } else if (new Set(claves).size !== claves.length) {
    errores.datos_extraidos = 'Hay nombres de dato repetidos.';
  } else if (filas.length > MAX_DATOS) {
    errores.datos_extraidos = `Máximo ${MAX_DATOS} datos.`;
  }

  return errores;
}

// Arma el cuerpo de POST /casos omitiendo lo que el asesor dejó vacío.
export function construirPayload(valores) {
  const salida_a3 = {};
  if (valores.resumen.trim()) salida_a3.resumen = valores.resumen.trim();
  if (valores.tono) salida_a3.tono = valores.tono;

  const filas = valores.datos.filter((f) => f.clave.trim() && f.valor.trim());
  if (filas.length) {
    salida_a3.datos_extraidos = Object.fromEntries(filas.map((f) => [f.clave.trim(), f.valor.trim()]));
  }

  return {
    id_caso: valores.id_caso.trim(),
    canal: valores.canal,
    texto_cliente: valores.texto_cliente.trim(),
    salida_a3,
  };
}

// Traduce el nombre de campo del backend (p. ej. "salida_a3.resumen") al del formulario.
export function campoDelFormulario(campoApi) {
  if (campoApi.startsWith('salida_a3.datos_extraidos')) return 'datos_extraidos';
  if (campoApi.startsWith('salida_a3.')) return campoApi.split('.')[1];
  return campoApi;
}
