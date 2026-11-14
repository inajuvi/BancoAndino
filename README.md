# Banco Andino · PoC de categorización — HU-01: Registrar una solicitud

Dos proyectos independientes:

| Carpeta | Stack | Contenido |
|---|---|---|
| `backend/` | Node.js (Express, ESM) | `POST /casos`, validación, idempotencia, auth por rol, Privacy Vault y bitácora simulados |
| `frontend/` | React + Vite | Formulario accesible y responsive de la consola del asesor |

## Puesta en marcha

```powershell
# 1) Backend (puerto 3000)
cd backend
npm install
copy .env.example .env      # ajusta JWT_SECRET
npm run dev

# 2) Token de desarrollo (en otra terminal, dentro de backend/)
npm run token               # copia el token que imprime

# 3) Frontend (puerto 5173)
cd ../frontend
npm install
npm run dev                 # abre http://localhost:5173 y pega el token en "Sesión de desarrollo"
```

Pruebas: `npm test` en cada proyecto (13 en el backend, una por criterio CA-1 a CA-8 más casos límite; 6 en el front).

## Contrato de `POST /casos` (requiere `Authorization: Bearer <token>` con rol `asesor`)

```json
{
  "id_caso": "CASO-0001",
  "canal": "CALL_CENTER | WHATSAPP | REDES_SOCIALES",
  "texto_cliente": "…",
  "salida_a3": { "resumen": "…", "tono": "…", "datos_extraidos": { "monto": "150000" } }
}
```

| Estado | Cuándo |
|---|---|
| 201 | Caso creado en `RECIBIDO`, con `trace_id` |
| 200 | `id_caso` ya existía: devuelve el existente (`ya_existia: true`) y audita `SOLICITUD_DUPLICADA` |
| 400 | Falta un campo, canal inválido, texto sobre el límite, campo desconocido o JSON mal formado (`error.campos` indica cuál) |
| 401 / 403 | Sin token o token inválido / rol distinto de asesor |
| 429 | Límite de peticiones |

## Trazabilidad con los criterios de aceptación

| CA | Dónde |
|---|---|
| CA-1 | `src/services/casoService.js`, `src/routes/casos.js` |
| CA-2, 3, 4 | `src/schemas/casoSchema.js` (límite en `MAX_TEXT_LENGTH`) |
| CA-5 | `casoService.js` + unicidad en el repositorio (cubre peticiones simultáneas) |
| CA-6 | La entidad no tiene texto original, solo `hash_texto_original` (SHA-256); el texto pasa por `vault/privacyVaultStub.js` |
| CA-7 | `audit/auditLogStub.js`: solo-añadir y encadenado por hash, sin datos personales |
| CA-8 | `src/middleware/auth.js` (se evalúa antes de leer el cuerpo) |

## Decisiones y límites (qué es real y qué se simula)

- **Simulado, con interfaz definida:** Privacy Vault (HU-03), bitácora (HU-13), inicio de sesión (HU-10) y base de datos. El repositorio es en memoria; `backend/db/migrations/001_solicitud.sql` deja listo el esquema para Aurora PostgreSQL. Los datos se pierden al reiniciar.
- El Vault simulado enmascara correos, tarjetas, teléfonos y números de 6 a 12 dígitos, pero **no detecta nombres**. No es válido para datos reales.
- **Fail-closed:** si el Vault falla, no se guarda nada (503).
- **Seguridad:** `helmet`, CORS restringido, límite de tamaño del cuerpo, rate limiting, esquema estricto (rechaza campos desconocidos), JWT con algoritmo fijado, errores internos sin detalle y sin registrar el cuerpo de las peticiones.
- La respuesta nunca incluye el texto ni el resumen del caso.
- El límite de texto del front (`VITE_MAX_TEXT_LENGTH`) debe coincidir con el del backend; el backend decide.
