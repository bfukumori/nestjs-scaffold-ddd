import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class InvalidMfaCodeError extends DomainError {
	public readonly kind: DomainErrorKind = "UNAUTHORIZED";

	constructor() {
		super("Invalid code");
	}
}
