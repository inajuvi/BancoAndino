import { forwardRef } from 'react';

const ETIQUETA_CANAL = { CALL_CENTER: 'Call center', WHATSAPP: 'WhatsApp', REDES_SOCIALES: 'Redes sociales' };

// Resultado del registro. Recibe el foco al aparecer para que lo anuncien los lectores de pantalla.
// Éxito/duplicado usan role="status" (cortés); el error usa role="alert" (inmediato).
const ResultBanner = forwardRef(function ResultBanner({ resultado, onCerrar }, ref) {
  if (!resultado) return null;

  if (resultado.tipo === 'error') {
    return (
      <div ref={ref} tabIndex={-1} role="alert" className="banner banner--error">
        <h2>No se pudo registrar la solicitud</h2>
        <p>{resultado.mensaje}</p>
        {resultado.detalles?.length > 0 && (
          <ul>
            {resultado.detalles.map((d) => <li key={`${d.campo}-${d.mensaje}`}>{d.mensaje}</li>)}
          </ul>
        )}
      </div>
    );
  }

  const duplicado = resultado.tipo === 'duplicado';
  const { caso } = resultado;
  return (
    <div ref={ref} tabIndex={-1} role="status" className={`banner ${duplicado ? 'banner--info' : 'banner--success'}`}>
      <h2>{duplicado ? 'Este caso ya estaba registrado' : 'Solicitud registrada'}</h2>
      <p>
        {duplicado
          ? 'No se creó un caso nuevo; estos son los datos del caso existente.'
          : 'El caso quedó listo para ser categorizado.'}
      </p>
      <dl>
        <div><dt>Caso</dt><dd>{caso.id_caso}</dd></div>
        <div><dt>Estado</dt><dd><span className="badge">{caso.estado}</span></dd></div>
        <div><dt>Canal</dt><dd>{ETIQUETA_CANAL[caso.canal] ?? caso.canal}</dd></div>
        <div><dt>Trazabilidad</dt><dd><code>{caso.trace_id}</code></dd></div>
      </dl>
      <button type="button" className="btn btn--ghost" onClick={onCerrar}>Cerrar aviso</button>
    </div>
  );
});

export default ResultBanner;
