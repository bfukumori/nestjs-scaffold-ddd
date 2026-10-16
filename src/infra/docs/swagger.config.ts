import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function createSwaggerDocument(app: INestApplication) {
	const config = new DocumentBuilder()
		.setTitle("NestJS Scaffold DDD")
		.setDescription(
			"Documentação da API NestJS Scaffold com Domain-Driven Design (DDD), Clean Architecture, Fastify e Zod v4 (Standard Schema).",
		)
		.setVersion("1.0")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "Insira o token JWT de acesso (Access Token)",
			},
			"bearer",
		)
		.addCookieAuth(
			"session",
			{
				type: "apiKey",
				in: "cookie",
				name: "session",
				description: "Cookie de sessão persistida",
			},
			"session",
		)
		.addTag("Auth", "Endpoints de autenticação, registro e login")
		.addTag("Auth - Email", "Verificação e alteração de e-mail")
		.addTag("Auth - MFA", "Autenticação em duas etapas (TOTP)")
		.addTag("Auth - Password", "Recuperação e redefinição de senha")
		.addTag("Auth - Sessions", "Gerenciamento de sessões ativas e encerramento")
		.addTag("Auth - Tokens", "Emissão, renovação e revogação de tokens JWT")
		.addTag("Users", "Gerenciamento de perfil e dados do usuário")
		.build();

	return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
	const document = createSwaggerDocument(app);

	SwaggerModule.setup("docs", app, document, {
		customSiteTitle: "NestJS Scaffold DDD - Swagger UI",
		jsonDocumentUrl: "docs/json",
		yamlDocumentUrl: "docs/yaml",
		swaggerOptions: {
			persistAuthorization: true,
			defaultModelsExpandDepth: 2,
		},
	});
}
