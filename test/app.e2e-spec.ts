import { Test, type TestingModule } from "@nestjs/testing";
import { afterAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("AppModule Bootstrap (E2E)", () => {
	let moduleRef: TestingModule;

	it("should successfully compile the application dependency injection graph", async () => {
		moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		expect(moduleRef).toBeDefined();
	});

	afterAll(async () => {
		if (moduleRef) {
			await moduleRef.close();
		}
	});
});
