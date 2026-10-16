import {
	Authenticate,
	CurrentUser,
	MfaService,
	Public,
	SignInService,
} from "@nestjs/authentication";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCookieAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { minutes, Throttle } from "@nestjs/throttler";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { InvalidMfaCodeError } from "@src/modules/auth/domain/errors/invalid-mfa-code.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import {
	type ConfirmMfaDto,
	confirmMfaSchema,
	mfaConfirmResponseSchema,
	mfaEnrollResponseSchema,
	mfaVerifyResponseSchema,
	type VerifyMfaDto,
	verifyMfaSchema,
} from "../dtos/mfa.schema.js";

@ApiTags("Auth - MFA")
@Controller("auth/mfa")
export class MfaController {
	constructor(
		private readonly mfaService: MfaService,
		private readonly signInService: SignInService,
	) {}

	@Post("enroll")
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Iniciar configuração de autenticação em duas etapas (MFA)",
		description:
			"Gera um segredo TOTP e a URI correspondente para pareamento em aplicativo autenticador.",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Segredo TOTP gerado com sucesso",
		standardSchema: mfaEnrollResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	enroll(@CurrentUser() user: User) {
		return this.mfaService.enroll(user.id, user.email.value);
	}

	@Authenticate({ mfa: true })
	@Post("replace")
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Substituir segredo de MFA existente",
		description:
			"Gera um novo segredo TOTP para substituição segura (requer MFA autenticado).",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Novo segredo TOTP gerado com sucesso",
		standardSchema: mfaEnrollResponseSchema,
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
	replace(@CurrentUser() user: User) {
		return this.mfaService.enroll(user.id, user.email.value, { replace: true });
	}

	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post("confirm")
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Confirmar ativação de MFA com código TOTP",
		description:
			"Valida o código de 6 dígitos gerado pelo aplicativo autenticador e retorna os códigos de recuperação.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "MFA confirmado e códigos de recuperação emitidos",
		standardSchema: mfaConfirmResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Código TOTP inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async confirm(
		@CurrentUser("id") userId: string,
		@Body({ schema: confirmMfaSchema }) { code }: ConfirmMfaDto,
	) {
		if (!(await this.signInService.confirmMfa(userId, code))) {
			throw new InvalidMfaCodeError();
		}
		return {
			recoveryCodes: await this.mfaService.generateRecoveryCodes(userId),
		};
	}

	@Public()
	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post("verify")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Validar segundo fator (MFA) do login",
		description:
			"Valida o código TOTP de 6 dígitos ou um código de recuperação para concluir a autenticação.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Segundo fator validado com sucesso",
		standardSchema: mfaVerifyResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Código TOTP ou código de recuperação inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async verify(@Body({ schema: verifyMfaSchema }) body: VerifyMfaDto) {
		const issued = await this.signInService.completeMfa({
			code: body.code,
			recoveryCode: body.recoveryCode,
		});
		if (!issued) {
			throw new InvalidMfaCodeError();
		}
		return { mfa: issued.session.mfa };
	}
}
