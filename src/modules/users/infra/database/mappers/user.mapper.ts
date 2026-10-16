import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { UserResponseDto } from "@src/modules/users/infra/http/dtos/user-response.dto.js";
import { UserPersistenceRow } from "../adapters/in-memory/in-memory-users.repository.js";

export const UserMapper = {
	toDomain(raw: UserPersistenceRow): User {
		return User.restore({
			id: raw.id,
			email: new Email(raw.email),
			emailVerified: raw.emailVerified,
			role: raw.role,
			passwordHash: raw.passwordHash,
			createdAt: raw.createdAt,
			updatedAt: raw.updatedAt,
		});
	},

	toPersistence(user: User): UserPersistenceRow {
		return {
			id: user.id,
			email: user.email.value,
			emailVerified: user.emailVerified,
			role: user.role,
			passwordHash: user.passwordHash,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	},

	toHTTP(user: User): UserResponseDto {
		return {
			id: user.id,
			email: user.email.value,
			role: user.role,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		};
	},
};
