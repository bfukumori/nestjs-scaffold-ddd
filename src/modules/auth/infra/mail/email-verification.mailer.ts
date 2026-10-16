import {
	AuthenticationRegistry,
	EmailVerificationHandler,
	type EmailVerificationLink,
} from "@nestjs/authentication";
import { Inject, Injectable } from "@nestjs/common";
import { type Mailable, Mailer } from "@nestjs/mail";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";

@Injectable()
export class VerifyEmailMail implements Mailable<EmailVerificationLink> {
	render({ url }: EmailVerificationLink) {
		return {
			subject: "Confirm your email address",
			template: "verify-email",
			context: { url },
		};
	}
}

@Injectable()
export class EmailVerificationMailer extends EmailVerificationHandler {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		private readonly mailer: Mailer,
		registry: AuthenticationRegistry,
	) {
		super();
		registry.registerHandler("emailVerification", this);
	}

	async send(link: EmailVerificationLink) {
		await this.mailer.send(VerifyEmailMail, { to: link.email, data: link });
	}

	async markVerified(userId: string, email: string): Promise<boolean> {
		const user = await this.usersRepository.findById(userId);
		if (!user || email !== user.email.value) {
			return false;
		}

		user.markEmailAsVerified();
		await this.usersRepository.save(user);

		return true;
	}
}
