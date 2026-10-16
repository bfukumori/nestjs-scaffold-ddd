export type DomainErrorKind =
	| "VALIDATION_ERROR"
	| "ENTITY_NOT_FOUND"
	| "CONFLICT"
	| "FORBIDDEN"
	| "UNAUTHORIZED"
	| "BUSINESS_RULE_VIOLATION";

export abstract class DomainError extends Error {
	public abstract readonly kind: DomainErrorKind;

	constructor(message: string) {
		super(message);
		this.name = new.target.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
