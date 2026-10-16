import { z } from "zod";

export const errorResponseSchema = z.object({
	statusCode: z.number().int().min(100).max(599),
	error: z.string(),
	message: z.string(),
	path: z.string(),
	requestId: z.string(),
	timestamp: z.string(),
	details: z.unknown().optional(),
});
export type ErrorResponseDto = z.infer<typeof errorResponseSchema>;
