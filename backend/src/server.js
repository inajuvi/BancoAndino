import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createAuditLogStub } from './audit/auditLogStub.js';
import { createCasoRepositoryMemory } from './repositories/casoRepositoryMemory.js';
import { createPrivacyVaultStub } from './vault/privacyVaultStub.js';

const config = loadConfig();

const app = createApp({
  config,
  repository: createCasoRepositoryMemory(),
  vault: createPrivacyVaultStub(),
  audit: createAuditLogStub(),
});

const server = app.listen(config.port, () => {
  console.log(`API de Banco Andino escuchando en http://localhost:${config.port}`);
});

// Cierre ordenado ante Ctrl+C o parada del contenedor.
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => server.close(() => process.exit(0)));
}
