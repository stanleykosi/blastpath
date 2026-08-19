export class InvalidFixtureError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "INVALID_FIXTURE fixture validation failed", {
      cause,
    });
    this.name = "InvalidFixtureError";
  }
}
