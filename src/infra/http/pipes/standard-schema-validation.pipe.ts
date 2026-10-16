import {
	BadRequestException,
	StandardSchemaValidationPipe,
} from "@nestjs/common";

export function createStandardSchemaValidationPipe(): StandardSchemaValidationPipe {
	return new StandardSchemaValidationPipe({
		validateCustomDecorators: true,
		transform: true,
		exceptionFactory: (issues) => {
			const details = issues.map((issue) => ({
				field:
					issue.path
						?.map((segment) =>
							typeof segment === "object" ? segment.key : segment,
						)
						.join(".") || "body",
				message: issue.message,
			}));

			return new BadRequestException({
				error: "VALIDATION_ERROR",
				message: "Validation failed",
				details,
			});
		},
	});
}
