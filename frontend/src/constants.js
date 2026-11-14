export const CANALES = [
  { valor: 'CALL_CENTER', etiqueta: 'Call center' },
  { valor: 'WHATSAPP', etiqueta: 'WhatsApp' },
  { valor: 'REDES_SOCIALES', etiqueta: 'Redes sociales' },
];

export const TONOS = ['Neutro', 'Preocupado', 'Molesto', 'Urgente'];

export const MAX_TEXTO = Number(import.meta.env.VITE_MAX_TEXT_LENGTH) || 5000;
export const MAX_RESUMEN = 2000;
export const MAX_DATOS = 20;
export const MAX_ID_CASO = 36;

export const API_URL = import.meta.env.VITE_API_URL ?? '';
