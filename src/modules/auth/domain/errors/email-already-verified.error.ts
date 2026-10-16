import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class EmailAlreadyVerifiedError extends DomainError {
	public readonly kind: DomainErrorKind = "CONFLICT";

	constructor(email: string) {
		super(`The email address "${email}" is already verified.`);
	}
}
