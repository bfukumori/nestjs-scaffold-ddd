import {
	AuthenticationRegistry,
	PasswordResetHandler,
	type PasswordResetLink,
	SignInService,
} from "@nestjs/authentication";
import { Inject, Injectable } from "@nestjs/common";
import { type Mailable, Mailer } from "@nestjs/mail";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";

@Injectable()
export class PasswordResetMail implements Mailable<PasswordResetLink> {
	render({ url }: PasswordResetLink) {
		return {
			subject: "Reset your password",
			template: "password-reset",
			context: { url },
		};
	}
}

@Injectable()
export class PasswordResetMailer extends PasswordResetHandler {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		private readonly mailer: Mailer,
		private readonly signInService: SignInService,
		registry: AuthenticationRegistry,
	) {
		super();
		registry.registerHandler("passwordReset", this);
	}

	async findUser(emailPlain: string) {
		let email: Email;
		try {
			email = new Email(emailPlain);
		} catch {
			return null;
		}

		const user = await this.usersRepository.findByEmail(email);
		if (!user) {
			return null;
		}

		return {
			id: user.id,
			email: user.email.value,
			passwordHash: user.passwordHash,
		};
	}

	async send(link: PasswordResetLink) {
		await this.mailer.send(PasswordResetMail, { to: link.email, data: link });
	}

	async updatePassword(userId: string, passwordHash: string): Promise<void> {
		const user = await this.usersRepository.findById(userId);
		if (!user) {
			return;
		}

		user.updatePassword(passwordHash);

		await this.usersRepository.save(user);
		await this.signInService.signOutEverywhere(userId);
	}
}
