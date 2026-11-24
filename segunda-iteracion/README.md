# Banco Andino · Segunda iteración: categorización multiagente (A4)

La primera iteración (carpetas `backend/` y `frontend/`) construyó la HU-01: registrar una solicitud.
Esta segunda iteración suma lo que faltaba demostrar: que el sistema multiagente **categoriza** la
solicitud y **detecta los casos complejos**, con el Privacy Vault y el motor de reglas antifraude
del diseño del Hito 1.

## Qué hace

```
Consola del asesor ─► API (validación, límite de peticiones)
                        │
                        ▼
                 Privacy Vault ── si queda un dato sin reemplazar ──► se bloquea el envío
                        │ (solo texto tokenizado)
                        ▼
        ┌── Clasificador ──┐
        │                  ├─► Validador ─► Orquestador ─► JSON de A4 ─► el asesor confirma o corrige
        └── Detector ──────┘                    ▲
                                                │
                     Motor de reglas antifraude (sin IA): si ve fraude, prevalece
```

| Archivo | Responsabilidad |
|---|---|
| `src/vault.js` | Reemplaza correo, tarjeta, celular (también con espacios o guiones), cédula, cuenta y nombre por tokens. Bloquea si queda una secuencia larga de dígitos. |
| `src/reglas.js` | Motor de reglas antifraude R1 a R4, independiente del modelo. |
| `src/agentes.js` | Instrucciones y esquemas JSON de los tres agentes; llamada al modelo con salida estructurada. |
| `src/orquestador.js` | Coordina los agentes, aplica las reglas y arma el JSON de A4 (Figura 1 del Hito 1). |
| `src/app.js` | API HTTP: validación con zod, cabeceras de seguridad, límite de peticiones y manejo de errores. |
| `src/evaluacion.js` | Mediciones de la Tabla 2 del Hito 1 para la prueba preliminar. |
| `public/` | Consola del asesor (mismo formulario y estilos de la HU-01). |

## Cómo correrlo

Requiere Node.js 20.6 o superior y una API key de Anthropic.

```bash
cd segunda-iteracion
npm install
cp .env.example .env        # pega la API key en ANTHROPIC_API_KEY
npm start                   # abre http://127.0.0.1:4000
npm test                    # 33 pruebas unitarias, no llaman al modelo
npm run evaluar             # prueba preliminar con 20 mensajes ficticios (60 llamadas al modelo, ~US$ 0,01 con Haiku)
```

Sin API key la consola abre y el Privacy Vault funciona, pero no se puede categorizar.

## Resultados de la prueba preliminar

20 mensajes ficticios escritos por el equipo (`data/mensajes.json`), sobre una lista de 14 categorías
de prueba. El detalle está en `resultados/`.

| Medición | Meta | Claude Opus 5.5 | Claude Haiku 5.5 |
|---|---|---|---|
| Acierto de la categoría sugerida | ≥ 80 % | 95 % (19/20) | 95 % (19/20) |
| Correcta entre sugerida y alternativas | ≥ 95 % | 100 % | 100 % |
| Casos complejos detectados | ≥ 95 % | 100 % (11/11) | 100 % (11/11) |
| Fraudes detectados como fraude | 100 % | 100 % (6/6) | 100 % (6/6) |
| Falsas alarmas | – | 0 | 0 |
| Costo del modelo por solicitud | COP 33 (business case) | COP 87 | COP 2 |

Veinte mensajes ficticios no sustituyen el gate 1: la medición con 5.000 solicitudes reales
anonimizadas sigue pendiente.

## Seguridad

- **Datos personales:** el modelo solo recibe texto tokenizado; los valores originales no se guardan.
  Si el Vault no logra reemplazar un dato numérico largo, la solicitud no se envía.
- **Instrucciones dentro del mensaje del cliente:** el texto del cliente va entre comillas triples y los
  agentes tienen la instrucción de no seguir órdenes que aparezcan ahí. La salida está restringida a un
  esquema JSON y el motor de reglas no depende del modelo.
- **API:** validación estricta de la entrada (zod), límite de 20 KB por petición, límite de
  peticiones por minuto, cabeceras de seguridad con `helmet` (incluye Content-Security-Policy) y
  errores sin detalles internos.
- **Red:** el servidor escucha solo en `127.0.0.1`.
- **Secretos:** la API key vive en `.env`, que está en `.gitignore`.
- **Interfaz:** todo texto que viene del servidor o del usuario se escapa antes de insertarse en la página.

## Límites conocidos

- La lista de categorías y los mensajes de prueba son supuestos del grupo; el caso no trae la lista real.
- El Vault usa expresiones regulares: detecta nombres solo después de "me llamo", "mi nombre es", "soy"
  o "habla". Un Vault productivo necesita un modelo de reconocimiento de entidades.
- No hay base de datos ni bitácora persistente; eso corresponde a las historias HU-03 y HU-13 del MVP.
