import { CurrentUser } from "@nestjs/authentication";
import { Controller, Get, HttpStatus, SerializeOptions } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCookieAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { errorResponseSchema } from "@src/infra/docs/error-response.dto.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { userResponseSchema } from "@src/modules/users/infra/http/dtos/user-response.dto.js";
import { UserMapper } from "../../database/mappers/user.mapper.js";

@ApiTags("Users")
@ApiBearerAuth("bearer")
@ApiCookieAuth("session")
@Controller("me")
@SerializeOptions({ schema: userResponseSchema })
export class MeController {
	@Get()
	@ApiOperation({
		summary: "Obter perfil do usuário autenticado",
		description:
			"Retorna os dados cadastrais e perfil do usuário atualmente autenticado.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Dados do perfil retornados com sucesso",
		standardSchema: userResponseSchema,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Não autenticado",
		standardSchema: errorResponseSchema,
	})
	me(@CurrentUser() user: User) {
		return UserMapper.toHTTP(user);
	}
}
