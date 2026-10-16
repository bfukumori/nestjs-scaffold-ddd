import { z } from "zod";

export const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const tokenResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string().optional(),
	tokenType: z.literal("bearer"),
	expiresIn: z.number(),
});
export type TokenResponseDto = z.infer<typeof tokenResponseSchema>;
