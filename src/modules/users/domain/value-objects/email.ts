import { InvalidEmailError } from "@src/modules/users/domain/errors/invalid-email.error.js";

export class Email {
	static readonly #EMAIL_REGEX =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
	#value: string;

	constructor(rawValue: string) {
		if (!rawValue || typeof rawValue !== "string") {
			throw new InvalidEmailError(String(rawValue));
		}

		const sanitized = rawValue.trim().toLowerCase();

		if (sanitized.length > 254 || !Email.#EMAIL_REGEX.test(sanitized)) {
			throw new InvalidEmailError(rawValue);
		}

		this.#value = sanitized;
		Object.freeze(this);
	}

	public get value(): string {
		return this.#value;
	}

	public equals(other: Email | null | undefined): boolean {
		if (!(other instanceof Email)) {
			return false;
		}
		return this.#value === other.#value;
	}

	public toString(): string {
		return this.#value;
	}
}
