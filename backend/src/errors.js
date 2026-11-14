// Error de negocio con estado HTTP, código estable y detalle por campo (opcional).
export class AppError extends Error {
  constructor(status, code, message, campos = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.campos = campos;
  }
}
