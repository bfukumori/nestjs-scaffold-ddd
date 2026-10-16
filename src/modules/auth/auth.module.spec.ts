import { describe, expect, it } from "vitest";
import { AuthModule } from "./auth.module.js";

describe("AuthModule", () => {
	it("should be defined and constructable", () => {
		expect(AuthModule).toBeDefined();
		const instance = new AuthModule();
		expect(instance).toBeInstanceOf(AuthModule);
	});
});
