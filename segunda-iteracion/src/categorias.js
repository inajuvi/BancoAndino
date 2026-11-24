// Lista de categorías de prueba (supuesto del grupo: el caso no trae la lista real del banco).
const CATEGORIAS = Object.freeze([
  { codigo: 'BLQ', nombre: 'Bloqueo de tarjeta por pérdida o robo' },
  { codigo: 'CNR', nombre: 'Cobro o compra no reconocida' },
  { codigo: 'SUP', nombre: 'Suplantación o mensaje sospechoso (phishing)' },
  { codigo: 'DOB', nombre: 'Cobro duplicado o error en un pago' },
  { codigo: 'TRF', nombre: 'Transferencia no recibida o fallida' },
  { codigo: 'COM', nombre: 'Reclamo por comisión o cuota de manejo' },
  { codigo: 'APP', nombre: 'Falla de la app o la banca digital' },
  { codigo: 'CLV', nombre: 'Clave, usuario o acceso bloqueado' },
  { codigo: 'CER', nombre: 'Certificado o constancia' },
  { codigo: 'EXT', nombre: 'Extracto, saldo o movimientos' },
  { codigo: 'ACT', nombre: 'Actualización de datos personales' },
  { codigo: 'CRE', nombre: 'Información o solicitud de crédito' },
  { codigo: 'PAG', nombre: 'Pago de crédito o tarjeta' },
  { codigo: 'OTR', nombre: 'Otra solicitud' },
]);

export const CODIGOS = CATEGORIAS.map((c) => c.codigo);

export const nombreDe = (codigo) => CATEGORIAS.find((c) => c.codigo === codigo)?.nombre ?? codigo;

export const CATALOGO_TEXTO = CATEGORIAS.map((c) => `- ${c.codigo}: ${c.nombre}`).join('\n');
