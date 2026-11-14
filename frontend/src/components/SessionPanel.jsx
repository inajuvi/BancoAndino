import { useId, useState } from 'react';

// SOLO DESARROLLO: el inicio de sesión real (Cognito) es la HU-10.
// El token vive en sessionStorage y se borra al cerrar la pestaña.
export default function SessionPanel({ token, onChange }) {
  const [valor, setValor] = useState('');
  const id = useId();

  const guardar = (e) => {
    e.preventDefault();
    if (valor.trim()) {
      onChange(valor.trim());
      setValor('');
    }
  };

  return (
    <details className="session" open={!token}>
      <summary>
        Sesión de desarrollo{' '}
        <span className={`badge ${token ? 'badge--ok' : 'badge--warn'}`}>{token ? 'Token cargado' : 'Sin token'}</span>
      </summary>
      <form onSubmit={guardar}>
        <p className="hint">
          Genera un token con <code>npm run token</code> en el backend y pégalo aquí. Reemplaza al inicio de sesión (HU-10).
        </p>
        <div className="session__row">
          <label htmlFor={id} className="sr-only">Token de asesor</label>
          <input id={id} type="password" autoComplete="off" placeholder="Pega el token de asesor" value={valor} onChange={(e) => setValor(e.target.value)} />
          <button type="submit" className="btn btn--secondary">Usar token</button>
          {token && <button type="button" className="btn btn--ghost" onClick={() => onChange('')}>Cerrar sesión</button>}
        </div>
      </form>
    </details>
  );
}
