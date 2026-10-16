import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { describe, expect, it } from "vitest";
import { MeController } from "./me.controller.js";

describe("MeController", () => {
	it("should map current user to HTTP response format", () => {
		const controller = new MeController();
		const user = User.restore({
			id: "usr_me_1",
			email: new Email("me@example.com"),
			emailVerified: true,
			role: "customer",
			passwordHash: "hash",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		});

		const result = controller.me(user);

		expect(result).toEqual({
			id: "usr_me_1",
			email: "me@example.com",
			role: "customer",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});
	});
});
