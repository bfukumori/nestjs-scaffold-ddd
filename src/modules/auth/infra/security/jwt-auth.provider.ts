import {
	AuthenticationRegistry,
	JwtBearerProvider,
	type JwtClaims,
} from "@nestjs/authentication";
import { Inject, Injectable } from "@nestjs/common";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		registry: AuthenticationRegistry,
	) {
		super({ realm: "store" });
		registry.registerProvider(this, { order: 1 });
	}

	validate({ sub }: JwtClaims) {
		return sub ? this.usersRepository.findById(sub) : null;
	}
}
