import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";

export class EmailAlreadyInUseError extends DomainError {
	public readonly kind: DomainErrorKind = "CONFLICT";

	constructor(email: string) {
		super(`The email address "${email}" is already registered`);
	}
}
