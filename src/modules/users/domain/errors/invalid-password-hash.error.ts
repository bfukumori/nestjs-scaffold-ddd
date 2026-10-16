import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class InvalidPasswordHashError extends DomainError {
	public readonly kind: DomainErrorKind = "VALIDATION_ERROR";

	constructor() {
		super("The password hash must be a non-empty string");
	}
}
