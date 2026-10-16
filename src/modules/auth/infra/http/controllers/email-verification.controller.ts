import {
	Authenticate,
	CurrentUser,
	EmailVerificationService,
	Public,
} from "@nestjs/authentication";
import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Inject,
	Patch,
	Post,
	SerializeOptions,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCookieAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { minutes, Throttle } from "@nestjs/throttler";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { EmailAlreadyInUseError } from "@src/modules/auth/domain/errors/email-already-in-use.error.js";
import { EmailAlreadyVerifiedError } from "@src/modules/auth/domain/errors/email-already-verified.error.js";
import { InvalidEmailLinkError } from "@src/modules/auth/domain/errors/invalid-email-link.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { UserMapper } from "@src/modules/users/infra/database/mappers/user.mapper.js";
import { userResponseSchema } from "@src/modules/users/infra/http/dtos/user-response.dto.js";
import {
	type EmailDto,
	emailSchema,
	type VerifyEmailDto,
	verifyEmailResponseSchema,
	verifyEmailSchema,
} from "../dtos/email-verification.schema.js";

@ApiTags("Auth - Email")
@Controller("auth/email")
export class EmailVerificationController {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		private readonly emailVerificationService: EmailVerificationService,
	) {}

	@Authenticate({ mfa: true })
	@Throttle({ default: { limit: 3, ttl: minutes(15) } })
	@Patch()
	@HttpCode(HttpStatus.OK)
	@SerializeOptions({ schema: userResponseSchema })
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Alterar e-mail do usuário autenticado",
		description:
			"Atualiza o endereço de e-mail da conta do usuário autenticado e dispara um novo fluxo de verificação. Requer MFA validado se configurado.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "E-mail alterado e link de confirmação enviado",
		standardSchema: userResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Endereço de e-mail inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.FORBIDDEN,
		description: "MFA pendente de validação",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "E-mail já utilizado por outro usuário",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async changeEmail(
		@CurrentUser() user: User,
		@Body({ schema: emailSchema }) body: EmailDto,
	) {
		const nextEmail = new Email(body.email);

		if (user.email.value === nextEmail.value) {
			return UserMapper.toHTTP(user);
		}

		const existingUser = await this.usersRepository.findByEmail(nextEmail);
		if (existingUser && existingUser.id !== user.id) {
			throw new EmailAlreadyInUseError(nextEmail.value);
		}

		user.changeEmail(nextEmail);

		await this.usersRepository.save(user);

		await this.emailVerificationService.send({
			id: user.id,
			email: nextEmail.value,
		});

		return UserMapper.toHTTP(user);
	}

	@Public()
	@Throttle({ default: { limit: 10, ttl: minutes(15) } })
	@Post("verify")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Confirmar e-mail via token",
		description:
			"Valida o token recebido no link de verificação enviado por e-mail.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "E-mail confirmado com sucesso",
		standardSchema: verifyEmailResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Token inválido ou expirado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async verify(@Body({ schema: verifyEmailSchema }) { token }: VerifyEmailDto) {
		const verified = await this.emailVerificationService.verify(token);
		if (!verified) {
			throw new InvalidEmailLinkError();
		}

		return {
			email: verified.email,
			emailVerified: true,
		};
	}

	@Throttle({ default: { limit: 3, ttl: minutes(15) } })
	@Post("verification")
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Reenviar e-mail de verificação",
		description:
			"Reenvia a mensagem com o link de verificação caso o e-mail do usuário logado ainda não esteja confirmado.",
	})
	@ApiResponse({
		status: HttpStatus.ACCEPTED,
		description: "E-mail de verificação reenviado com sucesso",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "E-mail já se encontra verificado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async resend(@CurrentUser() user: User) {
		if (user.emailVerified) {
			throw new EmailAlreadyVerifiedError(user.email.value);
		}

		await this.emailVerificationService.send({
			id: user.id,
			email: user.email.value,
		});
	}
}
