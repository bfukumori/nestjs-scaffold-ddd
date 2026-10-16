import compression from "@fastify/compress";
import {
	StandardSchemaSerializerInterceptor,
	VersioningType,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { EnvService } from "./infra/config/env/env.service.js";
import { setupSwagger } from "./infra/docs/swagger.config.js";
import { GlobalExceptionFilter } from "./infra/http/filters/global-exception.filter.js";
import { createStandardSchemaValidationPipe } from "./infra/http/pipes/standard-schema-validation.pipe.js";
import { resolveRequestId } from "./infra/http/utils/resolve-request-id.js";

async function bootstrap() {
	const adapter = new FastifyAdapter({
		requestIdHeader: false,
		genReqId: resolveRequestId,
		trustProxy: true,
	});

	adapter.getInstance().addHook("onSend", (request, reply, _payload, done) => {
		void reply.header("x-request-id", request.id);
		done();
	});

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		adapter,
		{ bufferLogs: true },
	);

	const pinoLogger = app.get(Logger);
	const envService = app.get(EnvService);
	const port = envService.get("PORT");

	app.useLogger(pinoLogger);

	await app.register(compression);

	app.enableVersioning({ defaultVersion: "1", type: VersioningType.URI });
	app.enableCors();
	app.enableCsrfProtection();
	app.useSecurityHeaders();

	app.useGlobalPipes(createStandardSchemaValidationPipe());
	app.useGlobalInterceptors(
		new StandardSchemaSerializerInterceptor(app.get(Reflector)),
	);
	app.useGlobalFilters(new GlobalExceptionFilter(envService));

	setupSwagger(app);

	await app.listen(port, "0.0.0.0", () => {
		pinoLogger.log(`Swagger UI: http://localhost:${port}/docs`);
	});
}
await bootstrap();
