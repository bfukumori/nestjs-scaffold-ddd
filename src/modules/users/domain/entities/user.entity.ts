import { InvalidPasswordHashError } from "../errors/invalid-password-hash.error.js";
import { Email } from "../value-objects/email.js";

export type Role = "customer" | "staff" | "admin";

export interface CreateUserProps {
	readonly id: string;
	readonly email: Email;
	readonly role?: Role;
	readonly passwordHash: string;
}

export interface RestoreUserProps {
	readonly id: string;
	readonly email: Email;
	readonly emailVerified: boolean;
	readonly role: Role;
	readonly passwordHash: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

export class User {
	public readonly id: string;
	public readonly createdAt: Date;

	private _email: Email;
	private _role: Role;
	private _passwordHash: string;
	private _emailVerified: boolean;
	private _updatedAt: Date;

	private constructor(props: RestoreUserProps) {
		this.id = props.id;
		this.createdAt = new Date(props.createdAt.getTime());
		this._email = props.email;
		this._role = props.role;
		this._passwordHash = props.passwordHash;
		this._emailVerified = props.emailVerified;
		this._updatedAt = new Date(props.updatedAt.getTime());
	}

	public static create(props: CreateUserProps): User {
		const now = new Date();

		return new User({
			id: props.id,
			email: props.email,
			role: props.role ?? "customer",
			passwordHash: props.passwordHash,
			emailVerified: false,
			createdAt: now,
			updatedAt: now,
		});
	}

	public static restore(props: RestoreUserProps): User {
		return new User(props);
	}

	public get email(): Email {
		return this._email;
	}

	public get role(): Role {
		return this._role;
	}

	public get passwordHash(): string {
		return this._passwordHash;
	}

	public get emailVerified(): boolean {
		return this._emailVerified;
	}

	public get updatedAt(): Date {
		return new Date(this._updatedAt.getTime());
	}

	public updatePassword(newPasswordHash: string): void {
		if (!newPasswordHash || newPasswordHash.trim().length === 0) {
			throw new InvalidPasswordHashError();
		}
		this._passwordHash = newPasswordHash;
		this._touch();
	}

	public rehashPassword(newPasswordHash: string): void {
		if (!newPasswordHash || newPasswordHash.trim().length === 0) {
			throw new InvalidPasswordHashError();
		}

		this._passwordHash = newPasswordHash;
		this._touch();
	}

	public changeEmail(newEmail: Email): void {
		if (this._email.value === newEmail.value) {
			return;
		}

		this._email = newEmail;
		this._emailVerified = false;
		this._touch();
	}

	public changeRole(newRole: Role): void {
		if (this._role === newRole) {
			return;
		}

		this._role = newRole;
		this._touch();
	}

	public markEmailAsVerified(): void {
		if (this._emailVerified) {
			return;
		}

		this._emailVerified = true;
		this._touch();
	}

	private _touch(): void {
		this._updatedAt = new Date();
	}
}
