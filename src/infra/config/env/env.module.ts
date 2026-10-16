import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envSchema } from "./env.schema.js";
import { EnvService } from "./env.service.js";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			validate: (config: Record<string, unknown>) => envSchema.parse(config),
		}),
	],
	providers: [EnvService],
	exports: [EnvService],
})
export class EnvModule {}
