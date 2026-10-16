import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class InvalidEmailError extends DomainError {
	public readonly kind: DomainErrorKind = "VALIDATION_ERROR";

	constructor(value: string) {
		super(`The email address "${value}" is invalid`);
	}
}
