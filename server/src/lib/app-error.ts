/**
 * Application error carrying an HTTP status and a stable machine-readable code.
 * Services throw these; the error middleware turns them into JSON responses.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(code = 'UNAUTHENTICATED', message = 'Sign in to continue.') {
    return new AppError(401, code, message);
  }
  static forbidden(code = 'FORBIDDEN', message = 'You do not have access to this resource.') {
    return new AppError(403, code, message);
  }
  static notFound(code: string, message: string) {
    return new AppError(404, code, message);
  }
  static conflict(code: string, message: string) {
    return new AppError(409, code, message);
  }
}
