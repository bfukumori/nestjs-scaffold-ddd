import { Module } from "@nestjs/common";
import { USERS_REPOSITORY } from "./domain/ports/users.repository.js";
import { InMemoryUsersRepository } from "./infra/database/adapters/in-memory/in-memory-users.repository.js";
import { MeController } from "./infra/http/controllers/me.controller.js";

@Module({
	providers: [
		{
			provide: USERS_REPOSITORY,
			useClass: InMemoryUsersRepository,
		},
	],
	controllers: [MeController],
	exports: [USERS_REPOSITORY],
})
export class UsersModule {}
