import { PasswordResetService, Public } from "@nestjs/authentication";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { minutes, Throttle } from "@nestjs/throttler";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { InvalidEmailLinkError } from "@src/modules/auth/domain/errors/invalid-email-link.error.js";
import {
	type EmailDto,
	emailSchema,
	type PasswordResetDto,
	passwordResetResponseSchema,
	passwordResetSchema,
} from "../dtos/password-reset.schema.js";

@ApiTags("Auth - Password")
@Public()
@Controller("auth/password")
export class PasswordResetController {
	constructor(private readonly passwordResetService: PasswordResetService) {}

	@Throttle({ default: { limit: 3, ttl: minutes(15) } })
	@Post("forgot")
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiOperation({
		summary: "Solicitar recuperação de senha",
		description:
			"Dispara um e-mail com token temporário e seguro para redefinição de senha caso a conta exista.",
	})
	@ApiResponse({
		status: HttpStatus.ACCEPTED,
		description: "Solicitação aceita e processada",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Endereço de e-mail inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	forgot(@Body({ schema: emailSchema }) body: EmailDto): void {
		this.passwordResetService.request(body.email);
	}

	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post("reset")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Redefinir senha com token",
		description:
			"Valida o token recebido e atualiza a senha da conta, realizando o login do usuário.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Senha alterada com sucesso",
		standardSchema: passwordResetResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Token inválido, expirado ou senha fora dos padrões exigidos",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async reset(@Body({ schema: passwordResetSchema }) body: PasswordResetDto) {
		const result = await this.passwordResetService.reset(
			body.token,
			body.password,
			{ signIn: true },
		);
		if (!result) {
			throw new InvalidEmailLinkError();
		}
		return { mfaRequired: result.signedIn?.session.mfa === "pending" };
	}
}
