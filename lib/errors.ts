export type ErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INACTIVE_RESOURCE"
  | "PAST_BOOKING"
  | "ALREADY_CANCELLED";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
