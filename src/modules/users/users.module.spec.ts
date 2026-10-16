import { describe, expect, it } from "vitest";
import { UsersModule } from "./users.module.js";

describe("UsersModule", () => {
	it("should be defined and constructable", () => {
		expect(UsersModule).toBeDefined();
		const instance = new UsersModule();
		expect(instance).toBeInstanceOf(UsersModule);
	});
});
