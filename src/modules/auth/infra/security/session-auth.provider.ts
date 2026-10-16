import {
	AuthenticationRegistry,
	SessionCookieProvider,
	type SessionRecord,
} from "@nestjs/authentication";
import { Inject, Injectable } from "@nestjs/common";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import {
	USERS_REPOSITORY,
	type UsersRepository,
} from "@src/modules/users/domain/ports/users.repository.js";

@Injectable()
export class SessionAuth extends SessionCookieProvider<User> {
	constructor(
		@Inject(USERS_REPOSITORY)
		private readonly usersRepository: UsersRepository,
		registry: AuthenticationRegistry,
	) {
		super();
		registry.registerProvider(this);
	}

	validate(session: SessionRecord) {
		return this.usersRepository.findById(session.userId);
	}
}
