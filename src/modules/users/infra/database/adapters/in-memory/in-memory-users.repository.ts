import { Injectable } from "@nestjs/common";
import { Role, User } from "@src/modules/users/domain/entities/user.entity.js";
import { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { UserMapper } from "../../mappers/user.mapper.js";

export interface UserPersistenceRow {
	id: string;
	email: string;
	emailVerified: boolean;
	role: Role;
	passwordHash: string;
	createdAt: Date;
	updatedAt: Date;
}

@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
	private readonly items = new Map<string, UserPersistenceRow>();

	public async save(user: User): Promise<void> {
		this.items.set(user.id, UserMapper.toPersistence(user));
	}

	public async findById(id: string): Promise<User | null> {
		const row = this.items.get(id);
		if (!row) {
			return null;
		}
		return UserMapper.toDomain(row);
	}

	public async findByEmail(email: Email | string): Promise<User | null> {
		const targetEmail =
			typeof email === "string" ? email.trim().toLowerCase() : email.value;

		for (const row of this.items.values()) {
			if (row.email === targetEmail) {
				return UserMapper.toDomain(row);
			}
		}

		return null;
	}

	public async existsByEmail(email: Email | string): Promise<boolean> {
		const user = await this.findByEmail(email);
		return user !== null;
	}

	public async delete(id: string): Promise<void> {
		this.items.delete(id);
	}
}
