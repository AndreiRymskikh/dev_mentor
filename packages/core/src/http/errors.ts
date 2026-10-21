export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly fieldErrors?: FieldErrors) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found") { super("NOT_FOUND", message, 404); }
}
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") { super("FORBIDDEN", message, 403); }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") { super("UNAUTHORIZED", message, 401); }
}
export class ValidationError extends AppError {
  constructor(message = "Invalid input", fieldErrors?: FieldErrors) { super("VALIDATION_ERROR", message, 400, fieldErrors); }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict") { super("CONFLICT", message, 409); }
}
export class ServiceUnavailableError extends AppError {
  constructor() { super("SERVICE_UNAVAILABLE", "Service temporarily unavailable", 503); }
}
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED", "Too many requests", 429);
    this.retryAfterSeconds = Number.isFinite(retryAfterSeconds) ? Math.min(3600, Math.max(1, Math.ceil(retryAfterSeconds))) : 3600;
  }
}
