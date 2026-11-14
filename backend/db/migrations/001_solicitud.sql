-- Tabla SOLICITUD (Figura 15). Referencia para Aurora PostgreSQL; la PoC local usa memoria.
-- Nota: NO existe columna con el texto original (CA-6); solo su huella SHA-256.
-- Las "etiquetas correctas" del equipo se agregan con la HU-02.
CREATE TABLE IF NOT EXISTS solicitud (
  id_caso                      VARCHAR(36) PRIMARY KEY,           -- unicidad = idempotencia (CA-5)
  trace_id                     UUID        NOT NULL UNIQUE,
  canal                        VARCHAR(20) NOT NULL
                                 CHECK (canal IN ('CALL_CENTER', 'WHATSAPP', 'REDES_SOCIALES')),
  texto_tokenizado             TEXT        NOT NULL,
  resumen_tokenizado           TEXT,
  tono_cliente                 VARCHAR(50),
  datos_extraidos_tokenizados  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  hash_texto_original          CHAR(64)    NOT NULL,
  estado                       VARCHAR(40) NOT NULL DEFAULT 'RECIBIDO'
                                 CHECK (estado IN ('RECIBIDO', 'PENDIENTE_REVISION_ASESOR',
                                                   'CATEGORIZADO_AUTOMATICO', 'CATEGORIZADO_POR_ASESOR')),
  fecha_recepcion              TIMESTAMPTZ NOT NULL DEFAULT now()
);
