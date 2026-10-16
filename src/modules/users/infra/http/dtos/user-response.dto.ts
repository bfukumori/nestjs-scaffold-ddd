import { z } from "zod";

export const userResponseSchema = z.object({
	id: z.uuid({ version: "v7" }),
	email: z.email(),
	role: z.enum(["customer", "staff", "admin"]),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;
