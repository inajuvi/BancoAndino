import { MAX_DATOS } from '../constants.js';

// Editor de pares nombre/valor (datos extraídos por A3). Cada fila se puede quitar.
export default function DatosExtraidosEditor({ filas, onChange, error, disabled }) {
  const actualizar = (id, campo, valor) =>
    onChange(filas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  const quitar = (id) => onChange(filas.filter((f) => f.id !== id));
  const agregar = () =>
    onChange([...filas, { id: crypto.randomUUID(), clave: '', valor: '' }]);

  return (
    <fieldset className={`datos${error ? ' field--error' : ''}`} disabled={disabled} aria-describedby={error ? 'datos-error' : 'datos-hint'}>
      <legend>Datos extraídos <span className="optional">(opcional)</span></legend>
      <p id="datos-hint" className="hint">Por ejemplo: monto, fecha de la transacción o comercio. No incluyas datos personales.</p>

      {filas.map((fila, i) => (
        <div className="datos__fila" key={fila.id}>
          <div>
            <label htmlFor={`dato-clave-${fila.id}`} className="sr-only">Nombre del dato {i + 1}</label>
            <input
              id={`dato-clave-${fila.id}`}
              placeholder="Nombre (ej. monto)"
              value={fila.clave}
              maxLength={50}
              onChange={(e) => actualizar(fila.id, 'clave', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`dato-valor-${fila.id}`} className="sr-only">Valor del dato {i + 1}</label>
            <input
              id={`dato-valor-${fila.id}`}
              placeholder="Valor (ej. 150000)"
              value={fila.valor}
              maxLength={500}
              onChange={(e) => actualizar(fila.id, 'valor', e.target.value)}
            />
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => quitar(fila.id)} aria-label={`Quitar dato ${i + 1}`}>
            Quitar
          </button>
        </div>
      ))}

      {error && <p id="datos-error" className="error-text">{error}</p>}

      <button type="button" className="btn btn--secondary" onClick={agregar} disabled={filas.length >= MAX_DATOS}>
        + Agregar dato
      </button>
    </fieldset>
  );
}
