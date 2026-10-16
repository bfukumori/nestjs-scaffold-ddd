import { User } from "../entities/user.entity.js";
import { Email } from "../value-objects/email.js";

export const USERS_REPOSITORY = Symbol("UsersRepository");

export interface UsersRepository {
	save(user: User): Promise<void>;
	findById(id: string): Promise<User | null>;
	findByEmail(email: Email | string): Promise<User | null>;
	existsByEmail(email: Email | string): Promise<boolean>;
	delete(id: string): Promise<void>;
}
