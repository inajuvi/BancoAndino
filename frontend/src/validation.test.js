import { describe, expect, it } from 'vitest';
import { campoDelFormulario, construirPayload, validarFormulario, VALORES_INICIALES } from './validation.js';

const opciones = { maxTexto: 50 };
const valido = { ...VALORES_INICIALES, id_caso: 'CASO-0001', canal: 'WHATSAPP', texto_cliente: 'Hola' };

describe('validarFormulario', () => {
  it('acepta un formulario con los campos obligatorios', () => {
    expect(validarFormulario(valido, opciones)).toEqual({});
  });

  it('exige id_caso, canal y texto', () => {
    const errores = validarFormulario(VALORES_INICIALES, opciones);
    expect(Object.keys(errores)).toEqual(['id_caso', 'canal', 'texto_cliente']);
  });

  it('rechaza un id_caso con espacios y un texto sobre el límite', () => {
    const errores = validarFormulario(
      { ...valido, id_caso: 'CASO 1', texto_cliente: 'a'.repeat(51) },
      opciones,
    );
    expect(errores.id_caso).toBeDefined();
    expect(errores.texto_cliente).toMatch(/50/);
  });

  it('detecta datos incompletos y repetidos', () => {
    const incompleto = { ...valido, datos: [{ id: 1, clave: 'monto', valor: '' }] };
    expect(validarFormulario(incompleto, opciones).datos_extraidos).toBeDefined();
    const repetido = {
      ...valido,
      datos: [
        { id: 1, clave: 'monto', valor: '10' },
        { id: 2, clave: 'monto', valor: '20' },
      ],
    };
    expect(validarFormulario(repetido, opciones).datos_extraidos).toMatch(/repetidos/);
  });
});

describe('construirPayload', () => {
  it('omite lo vacío y arma datos_extraidos', () => {
    const payload = construirPayload({
      ...valido,
      id_caso: ' CASO-0001 ',
      tono: 'Molesto',
      datos: [
        { id: 1, clave: 'monto', valor: '150000' },
        { id: 2, clave: '', valor: '' },
      ],
    });
    expect(payload).toEqual({
      id_caso: 'CASO-0001',
      canal: 'WHATSAPP',
      texto_cliente: 'Hola',
      salida_a3: { tono: 'Molesto', datos_extraidos: { monto: '150000' } },
    });
  });
});

describe('campoDelFormulario', () => {
  it('mapea los campos de salida_a3', () => {
    expect(campoDelFormulario('salida_a3.resumen')).toBe('resumen');
    expect(campoDelFormulario('salida_a3.datos_extraidos.monto')).toBe('datos_extraidos');
    expect(campoDelFormulario('canal')).toBe('canal');
  });
});
