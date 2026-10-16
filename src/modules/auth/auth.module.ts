import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module.js";
import { CredentialsService } from "./application/services/credentials.service.js";
import { AuthController } from "./infra/http/controllers/auth.controller.js";
import { EmailVerificationController } from "./infra/http/controllers/email-verification.controller.js";
import { MfaController } from "./infra/http/controllers/mfa.controller.js";
import { PasswordResetController } from "./infra/http/controllers/password-reset.controller.js";
import { SessionsController } from "./infra/http/controllers/sessions.controller.js";
import { TokensController } from "./infra/http/controllers/tokens.controller.js";
import {
	EmailVerificationMailer,
	VerifyEmailMail,
} from "./infra/mail/email-verification.mailer.js";
import {
	PasswordResetMail,
	PasswordResetMailer,
} from "./infra/mail/password-reset.mailer.js";
import { JwtAuth } from "./infra/security/jwt-auth.provider.js";
import { SessionAuth } from "./infra/security/session-auth.provider.js";

@Module({
	imports: [UsersModule],
	controllers: [
		AuthController,
		EmailVerificationController,
		PasswordResetController,
		TokensController,
		SessionsController,
		MfaController,
	],
	providers: [
		SessionAuth,
		JwtAuth,
		CredentialsService,
		VerifyEmailMail,
		EmailVerificationMailer,
		PasswordResetMail,
		PasswordResetMailer,
	],
})
export class AuthModule {}
