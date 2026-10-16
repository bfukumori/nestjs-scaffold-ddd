import { z } from "zod";

export const sessionItemSchema = z.object({
	id: z.string(),
	createdAt: z.string(),
	lastActiveAt: z.string(),
	userAgent: z.string().nullable(),
	current: z.boolean(),
});
export type SessionItemDto = z.infer<typeof sessionItemSchema>;

export const sessionListResponseSchema = z.array(sessionItemSchema);
export type SessionListResponseDto = z.infer<typeof sessionListResponseSchema>;
