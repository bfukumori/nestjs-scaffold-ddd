import { Public, TokenService } from "@nestjs/authentication";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { minutes, Throttle } from "@nestjs/throttler";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { CredentialsService } from "@src/modules/auth/application/services/credentials.service.js";
import { InvalidCredentialsError } from "@src/modules/auth/domain/errors/invalid-credentials.error.js";
import { type SignInDto, signInSchema } from "../dtos/auth.schema.js";
import {
	type RefreshTokenDto,
	refreshTokenSchema,
	tokenResponseSchema,
} from "../dtos/tokens.schema.js";

@ApiTags("Auth - Tokens")
@Public()
@Controller("auth/token")
export class TokensController {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly tokenService: TokenService,
	) {}

	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Emitir par de tokens JWT",
		description:
			"Autentica o usuário via e-mail e senha, retornando um par contendo Access Token (Bearer) e Refresh Token.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Tokens gerados com sucesso",
		standardSchema: tokenResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Dados de requisição inválidos",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Credenciais inválidas",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async issue(@Body({ schema: signInSchema }) body: SignInDto) {
		const user = await this.credentialsService.verify(
			body.email,
			body.password,
		);
		if (!user) {
			throw new InvalidCredentialsError();
		}
		return this.tokenService.issue(user.id, {
			method: "password",
			claims: { amr: ["pwd"] },
		});
	}

	@Throttle({ default: { limit: 10, ttl: minutes(1) } })
	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Renovar tokens via Refresh Token",
		description:
			"Gera um novo Access Token e atualiza o Refresh Token caso seja rotacionado.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Tokens renovados com sucesso",
		standardSchema: tokenResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Refresh token inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	refresh(
		@Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenDto,
	) {
		return this.tokenService.refresh(refreshToken);
	}

	@Throttle({ default: { limit: 10, ttl: minutes(1) } })
	@Post("revoke")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: "Revogar Refresh Token",
		description:
			"Invalida o refresh token informado, impedindo futuras renovações de token.",
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Refresh token revogado com sucesso",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Refresh token inválido",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async revoke(
		@Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenDto,
	) {
		await this.tokenService.revoke(refreshToken);
	}
}
