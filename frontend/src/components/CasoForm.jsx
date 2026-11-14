import { useEffect, useRef, useState } from 'react';
import { CANALES, MAX_RESUMEN, MAX_TEXTO, TONOS } from '../constants.js';
import { ApiError, registrarCaso } from '../services/casosApi.js';
import { campoDelFormulario, construirPayload, validarFormulario, VALORES_INICIALES } from '../validation.js';
import DatosExtraidosEditor from './DatosExtraidosEditor.jsx';
import Field from './Field.jsx';
import ResultBanner from './ResultBanner.jsx';

// Orden visual de los campos, para llevar el foco al primero con error.
const ORDEN_CAMPOS = ['id_caso', 'canal', 'texto_cliente', 'resumen', 'tono', 'datos_extraidos'];

export default function CasoForm({ token }) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const bannerRef = useRef(null);
  const formRef = useRef(null);
  const abortRef = useRef(null);

  // Cancela una petición en curso si el componente se desmonta.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Lleva el foco al aviso cuando aparece un resultado.
  useEffect(() => {
    if (resultado) bannerRef.current?.focus();
  }, [resultado]);

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
    if (errores[campo]) setErrores(({ [campo]: _quitado, ...resto }) => resto);
  };

  const enfocarPrimerError = (errs) => {
    const campo = ORDEN_CAMPOS.find((c) => errs[c]);
    const el = campo && formRef.current?.querySelector(campo === 'datos_extraidos' ? '.datos input, .datos button' : `#${campo}`);
    el?.focus();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setResultado(null);

    const errs = validarFormulario(valores, { maxTexto: MAX_TEXTO });
    setErrores(errs);
    if (Object.keys(errs).length) {
      enfocarPrimerError(errs);
      return;
    }

    abortRef.current = new AbortController();
    setEnviando(true);
    try {
      const respuesta = await registrarCaso(construirPayload(valores), token, { signal: abortRef.current.signal });
      const duplicado = respuesta.status === 200;
      setResultado({ tipo: duplicado ? 'duplicado' : 'exito', caso: respuesta });
      if (!duplicado) setValores(VALORES_INICIALES); // listo para el siguiente caso
    } catch (error) {
      if (error.name === 'AbortError') return;
      const api = error instanceof ApiError ? error : new ApiError({ status: 0, message: 'Ocurrió un error inesperado.' });
      // Errores 400: se marcan los campos que señaló el backend.
      const delBackend = {};
      for (const { campo, mensaje } of api.campos) delBackend[campoDelFormulario(campo)] ??= mensaje;
      setErrores(delBackend);
      setResultado({ tipo: 'error', mensaje: api.message, detalles: api.campos.length > 1 ? api.campos : [] });
      if (Object.keys(delBackend).length) enfocarPrimerError(delBackend);
    } finally {
      setEnviando(false);
    }
  };

  const restantes = MAX_TEXTO - valores.texto_cliente.length;

  return (
    <form ref={formRef} onSubmit={enviar} noValidate aria-busy={enviando} className="card">
      <ResultBanner ref={bannerRef} resultado={resultado} onCerrar={() => setResultado(null)} />

      <h2 className="card__title">Datos de la solicitud</h2>
      <p className="hint">Los campos con <span aria-hidden="true">*</span><span className="sr-only">asterisco</span> son obligatorios.</p>

      <div className="grid">
        <Field id="id_caso" label="Identificador del caso" required hint="Ej. CASO-0001" error={errores.id_caso}>
          {(props) => (
            <input {...props} value={valores.id_caso} onChange={cambiar('id_caso')} maxLength={36} autoComplete="off" disabled={enviando} />
          )}
        </Field>

        <Field id="canal" label="Canal de atención" required error={errores.canal}>
          {(props) => (
            <select {...props} value={valores.canal} onChange={cambiar('canal')} disabled={enviando}>
              <option value="">Selecciona un canal…</option>
              {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
            </select>
          )}
        </Field>
      </div>

      <Field id="texto_cliente" label="Texto del cliente o transcripción" required error={errores.texto_cliente} hint="Copia el mensaje tal cual lo escribió el cliente o la transcripción de la llamada.">
        {(props) => (
          <>
            <textarea {...props} rows={6} value={valores.texto_cliente} onChange={cambiar('texto_cliente')} disabled={enviando} />
            <p className={`counter${restantes < 0 ? ' counter--over' : ''}`} aria-live="off">
              {restantes >= 0 ? `${restantes} caracteres disponibles` : `${-restantes} caracteres de más`}
            </p>
          </>
        )}
      </Field>

      <h2 className="card__title">Salida de “Identificar la solicitud” (A3)</h2>

      <Field id="resumen" label="Resumen de lo que pide el cliente" error={errores.resumen}>
        {(props) => (
          <textarea {...props} rows={3} maxLength={MAX_RESUMEN} value={valores.resumen} onChange={cambiar('resumen')} disabled={enviando} />
        )}
      </Field>

      <div className="grid">
        <Field id="tono" label="Tono del cliente" error={errores.tono}>
          {(props) => (
            <select {...props} value={valores.tono} onChange={cambiar('tono')} disabled={enviando}>
              <option value="">Sin especificar</option>
              {TONOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </Field>
      </div>

      <DatosExtraidosEditor
        filas={valores.datos}
        onChange={(datos) => {
          setValores((v) => ({ ...v, datos }));
          if (errores.datos_extraidos) setErrores(({ datos_extraidos: _q, ...resto }) => resto);
        }}
        error={errores.datos_extraidos}
        disabled={enviando}
      />

      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={enviando}>
          {enviando && <span className="spinner" aria-hidden="true" />}
          {enviando ? 'Registrando…' : 'Registrar solicitud'}
        </button>
        <button type="button" className="btn btn--ghost" disabled={enviando} onClick={() => { setValores(VALORES_INICIALES); setErrores({}); setResultado(null); }}>
          Limpiar formulario
        </button>
      </div>
    </form>
  );
}
