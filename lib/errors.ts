export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "LOCKED"
  | "INTERNAL";

export type FieldErrors = Record<string, string[] | undefined>;

export interface ActionError {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfterSec?: number;
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError };

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: FieldErrors,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toActionError(err: unknown): ActionError {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, fieldErrors: err.fieldErrors, retryAfterSec: err.retryAfterSec };
  }
  console.error("Unhandled error", err);
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}
