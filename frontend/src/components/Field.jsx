// Envoltura accesible de un campo: etiqueta, ayuda y error enlazados con aria-describedby.
export default function Field({ id, label, required = false, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="required" aria-hidden="true"> *</span>
        ) : (
          <span className="optional"> (opcional)</span>
        )}
      </label>
      {hint && <p id={hintId} className="hint">{hint}</p>}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined, 'aria-required': required || undefined })}
      {error && <p id={errorId} className="error-text">{error}</p>}
    </div>
  );
}
