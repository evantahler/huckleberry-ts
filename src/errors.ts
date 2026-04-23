export type ErrorCategory =
  | "not_found"
  | "access_denied"
  | "invalid_input"
  | "auth"
  | "network"
  | "internal";

export class HuckleberryError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly recovery: string;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      category?: ErrorCategory;
      retryable?: boolean;
      recovery?: string;
    },
  ) {
    super(message, options);
    this.name = "HuckleberryError";
    this.category = options?.category ?? "internal";
    this.retryable = options?.retryable ?? false;
    this.recovery = options?.recovery ?? "";
  }
}

export class AuthenticationError extends HuckleberryError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      cause,
      category: "auth",
      retryable: false,
      recovery:
        "Verify HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD (or the options passed to new Huckleberry({ email, password })). If credentials are correct, sign in to the Huckleberry app to confirm the account is active.",
    });
    this.name = "AuthenticationError";
  }
}

export class ChildNotFoundError extends HuckleberryError {
  constructor(childId: string) {
    super(`Child not found: ${childId}`, {
      category: "not_found",
      recovery:
        "Use client.user.listChildren() (or the list_children MCP tool) to get valid child IDs for this account.",
    });
    this.name = "ChildNotFoundError";
  }
}

export class InvalidDateRangeError extends HuckleberryError {
  constructor(message: string) {
    super(message, {
      category: "invalid_input",
      recovery:
        "Pass a DateRange with `start` strictly before `end`. Both must be valid Date objects (or ISO 8601 strings via MCP).",
    });
    this.name = "InvalidDateRangeError";
  }
}

export class ApiError extends HuckleberryError {
  readonly code: string | undefined;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      code?: string;
      category?: ErrorCategory;
      retryable?: boolean;
      recovery?: string;
    },
  ) {
    super(message, {
      cause: options?.cause,
      category: options?.category ?? "network",
      retryable: options?.retryable ?? true,
      recovery:
        options?.recovery ??
        "Retry the request. If the error persists, check Huckleberry's status and your network connection.",
    });
    this.name = "ApiError";
    this.code = options?.code;
  }
}

// Maps a FirestoreError (or similar shape with a `code` string) into our hierarchy.
// We key off the `code` because instanceof checks against `FirestoreError` don't
// survive module boundaries in tests that mock the firebase SDK.
export function wrapFirestoreError(
  err: unknown,
  context: string,
): HuckleberryError {
  if (err instanceof HuckleberryError) return err;

  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "unknown error";

  if (code === "permission-denied") {
    return new ApiError(`${context}: permission denied (${message})`, {
      cause: err,
      code,
      category: "access_denied",
      retryable: false,
      recovery:
        "Huckleberry's Firebase rules rejected this read. Confirm the signed-in account owns the requested child.",
    });
  }
  if (code === "unauthenticated") {
    return new AuthenticationError(
      `${context}: unauthenticated (${message})`,
      err,
    );
  }
  if (code === "not-found") {
    return new ApiError(`${context}: not found (${message})`, {
      cause: err,
      code,
      category: "not_found",
      retryable: false,
    });
  }
  if (code === "invalid-argument") {
    return new ApiError(`${context}: invalid argument (${message})`, {
      cause: err,
      code,
      category: "invalid_input",
      retryable: false,
    });
  }
  return new ApiError(`${context}: ${message}`, { cause: err, code });
}
