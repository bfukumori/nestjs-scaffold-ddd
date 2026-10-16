import {
	CurrentSession,
	CurrentUser,
	Public,
	type SessionRecord,
	SessionService,
	SignInService,
} from "@nestjs/authentication";
import {
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	Post,
	UnauthorizedException,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCookieAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { sessionListResponseSchema } from "../dtos/sessions.schema.js";

@ApiTags("Auth - Sessions")
@Controller("auth")
export class SessionsController {
	constructor(
		private readonly sessionService: SessionService,
		private readonly signInService: SignInService,
	) {}

	@Get("sessions")
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Listar sessões ativas do usuário",
		description:
			"Retorna a lista de todas as sessões ativas com data de criação, última atividade e metadados.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Lista de sessões ativas retornada com sucesso",
		standardSchema: sessionListResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	async list(
		@CurrentUser("id") userId: string,
		@CurrentSession() current: SessionRecord,
	) {
		const sessions = await this.sessionService.list(userId);
		return sessions.map(({ id, createdAt, lastActiveAt, metadata }) => ({
			id,
			createdAt,
			lastActiveAt,
			userAgent: metadata?.userAgent ?? null,
			current: id === current.id,
		}));
	}

	@Delete("sessions/:id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiParam({ name: "id", description: "ID único da sessão a ser revogada" })
	@ApiOperation({
		summary: "Revogar sessão específica",
		description: "Encerra a sessão especificada pelo ID.",
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Sessão revogada com sucesso",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Sessão não encontrada",
		standardSchema: errorResponseSchema,
	})
	async revoke(@CurrentUser("id") userId: string, @Param("id") id: string) {
		if (!(await this.sessionService.revoke(id, { userId }))) {
			throw new NotFoundException();
		}
	}

	@Public()
	@Post("sign-out")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: "Encerrar sessão atual (Logout)",
		description: "Invalida a sessão ativa do usuário atual.",
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Logout efetuado com sucesso",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Nenhuma sessão ativa encontrada",
		standardSchema: errorResponseSchema,
	})
	async signOut() {
		if (!(await this.signInService.signOut())) {
			throw new UnauthorizedException();
		}
	}

	@Post("sign-out-everywhere")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth("bearer")
	@ApiCookieAuth("session")
	@ApiOperation({
		summary: "Encerrar todas as sessões do usuário",
		description:
			"Invalida todas as sessões ativas do usuário em todos os navegadores e dispositivos.",
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: "Todas as sessões foram encerradas com sucesso",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	async signOutEverywhere(@CurrentUser("id") userId: string) {
		await this.signInService.signOutEverywhere(userId);
	}
}
