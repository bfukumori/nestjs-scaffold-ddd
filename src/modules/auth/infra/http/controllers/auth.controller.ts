import { Public, SignInService } from "@nestjs/authentication";
import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	SerializeOptions,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { minutes, Throttle } from "@nestjs/throttler";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { CredentialsService } from "@src/modules/auth/application/services/credentials.service.js";
import { InvalidCredentialsError } from "@src/modules/auth/domain/errors/invalid-credentials.error.js";
import { UserMapper } from "@src/modules/users/infra/database/mappers/user.mapper.js";
import { userResponseSchema } from "@src/modules/users/infra/http/dtos/user-response.dto.js";
import {
	type SignInDto,
	type SignUpDto,
	signInResponseSchema,
	signInSchema,
	signUpSchema,
} from "../dtos/auth.schema.js";

@ApiTags("Auth")
@Public()
@Controller("auth")
export class AuthController {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly signInService: SignInService,
	) {}

	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post("sign-up")
	@SerializeOptions({ schema: userResponseSchema })
	@ApiOperation({
		summary: "Registrar novo usuário",
		description:
			"Cria uma nova conta de usuário com e-mail e senha, autentica o usuário e retorna os dados do perfil.",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Usuário cadastrado e autenticado com sucesso",
		standardSchema: userResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Dados de requisição inválidos",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: "E-mail já cadastrado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Limite de tentativas excedido",
		standardSchema: errorResponseSchema,
	})
	async signUp(
		@Body({
			schema: signUpSchema,
		})
		body: SignUpDto,
	) {
		const user = await this.credentialsService.register(
			body.email,
			body.password,
		);

		await this.signInService.signIn(user.id, { method: "password" });

		return UserMapper.toHTTP(user);
	}

	@Throttle({ default: { limit: 5, ttl: minutes(15) } })
	@Post("sign-in")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Autenticar usuário via credenciais",
		description:
			"Valida e-mail e senha, iniciando uma sessão autenticada. Se MFA estiver configurado, retorna mfaRequired: true.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Autenticação realizada com sucesso",
		standardSchema: signInResponseSchema,
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
	async signIn(
		@Body({
			schema: signInSchema,
		})
		body: SignInDto,
	) {
		const user = await this.credentialsService.verify(
			body.email,
			body.password,
		);
		if (!user) {
			throw new InvalidCredentialsError();
		}
		const { session } = await this.signInService.signIn(user.id, {
			method: "password",
		});
		return { mfaRequired: session.mfa === "pending" };
	}
}
