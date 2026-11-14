import { useState } from 'react';
import CasoForm from './components/CasoForm.jsx';
import SessionPanel from './components/SessionPanel.jsx';

const CLAVE = 'ba_dev_token';

// Acceso a sessionStorage protegido: puede estar bloqueado (modo privado, políticas).
const leerToken = () => { try { return sessionStorage.getItem(CLAVE) ?? ''; } catch { return ''; } };
const guardarToken = (t) => {
  try { t ? sessionStorage.setItem(CLAVE, t) : sessionStorage.removeItem(CLAVE); } catch { /* sin persistencia */ }
};

export default function App() {
  const [token, setToken] = useState(leerToken);
  const cambiarToken = (t) => { guardarToken(t); setToken(t); };

  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="topbar">
        <div className="topbar__inner">
          <span className="logo" aria-hidden="true">BA</span>
          <div>
            <p className="topbar__brand">Banco Andino</p>
            <p className="topbar__sub">Consola del asesor · PoC de categorización</p>
          </div>
        </div>
      </header>

      <main id="contenido" className="container">
        <h1>Registrar una solicitud</h1>
        <p className="lead">Ingresa el caso para que el sistema lo categorice. El texto original no se guarda: solo su versión protegida.</p>
        <SessionPanel token={token} onChange={cambiarToken} />
        <CasoForm token={token} />
      </main>
    </>
  );
}
