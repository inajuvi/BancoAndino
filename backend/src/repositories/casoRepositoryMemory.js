// Repositorio en memoria para la PoC local. Mismo contrato que tendría el de PostgreSQL
// (ver db/migrations/001_solicitud.sql): findByIdCaso y create, con unicidad sobre id_caso.
export function createCasoRepositoryMemory() {
  const casos = new Map();

  return {
    async findByIdCaso(idCaso) {
      const caso = casos.get(idCaso);
      return caso ? structuredClone(caso) : null;
    },
    async create(caso) {
      if (casos.has(caso.id_caso)) {
        const error = new Error('id_caso duplicado');
        error.code = 'DUPLICATE';
        throw error;
      }
      casos.set(caso.id_caso, structuredClone(caso));
    },
    // Solo para pruebas: lo que realmente quedó persistido.
    snapshot: () => [...casos.values()].map((c) => structuredClone(c)),
  };
}
