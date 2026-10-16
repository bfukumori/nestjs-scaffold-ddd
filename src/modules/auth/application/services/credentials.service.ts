import { randomUUIDv7 } from "node:crypto";
import {
	EmailVerificationService,
	PasswordHasher,
} from "@nestjs/authentication";
import { Inject, Injectable } from "@nestjs/common";
import { EmailAlreadyInUseError } from "@src/modules/auth/domain/errors/email-already-in-use.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";

@Injectable()
export class CredentialsService {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		private readonly passwordHasher: PasswordHasher,
		private readonly emailVerificationService: EmailVerificationService,
	) {}

	public async register(
		emailPlain: string,
		passwordPlain: string,
	): Promise<User> {
		const email = new Email(emailPlain);
		const existingUser = await this.usersRepository.findByEmail(email);

		if (existingUser) {
			throw new EmailAlreadyInUseError(existingUser.email.value);
		}

		const passwordHash = await this.passwordHasher.hash(passwordPlain);

		const user = User.create({
			id: randomUUIDv7(),
			email,
			passwordHash,
		});

		await this.usersRepository.save(user);

		await this.emailVerificationService.send({
			id: user.id,
			email: user.email.value,
		});

		return user;
	}

	async verify(
		emailPlain: string,
		passwordPlain: string,
	): Promise<User | null> {
		let email: Email;

		try {
			email = new Email(emailPlain);
		} catch {
			await this.passwordHasher.verify(passwordPlain, null);
			return null;
		}

		const user = await this.usersRepository.findByEmail(email);

		const valid = await this.passwordHasher.verify(
			passwordPlain,
			user?.passwordHash,
		);

		if (!valid || !user?.passwordHash) {
			return null;
		}

		if (this.passwordHasher.needsRehash(user.passwordHash)) {
			const hashPwd = await this.passwordHasher.hash(passwordPlain);
			user.rehashPassword(hashPwd);
			await this.usersRepository.save(user);
		}

		return user;
	}
}
