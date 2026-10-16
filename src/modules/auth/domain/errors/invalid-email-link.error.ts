import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class InvalidEmailLinkError extends DomainError {
	public readonly kind: DomainErrorKind = "VALIDATION_ERROR";

	constructor() {
		super("Invalid or expired link");
	}
}
