<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS Logo" />
  </a>
</p>

<h1 align="center">NestJS Scaffold DDD</h1>

<p align="center">
  Template base <i>enterprise-ready</i> para APIs modernas e resilientes construídas com <b>NestJS 12</b> (ESM nativo), <b>Domain-Driven Design (DDD)</b>, <b>Clean Architecture (Ports & Adapters)</b>, <b>Fastify</b>, <b>Zod v4 (Standard Schema)</b>, <b>Biome</b>, <b>Vitest</b> e <b>100% de cobertura de testes</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-12-ea2845?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 12" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Fastify-Platform-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/OpenAPI-Swagger-85ea2d?style=for-the-badge&logo=swagger&logoColor=black" alt="OpenAPI / Swagger" />
  <img src="https://img.shields.io/badge/Bun-Runtime%20%26%20PM-fbf0df?style=for-the-badge&logo=bun&logoColor=black" alt="Bun" />
  <img src="https://img.shields.io/badge/Coverage-100%25-brightgreen?style=for-the-badge&logo=vitest&logoColor=white" alt="100% Coverage" />
  <img src="https://img.shields.io/badge/Linter-Biome-60a5fa?style=for-the-badge&logo=biome&logoColor=white" alt="Biome" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
</p>

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Diferenciais & Recursos](#-diferenciais--recursos)
- [Arquitetura & Estrutura do Projeto](#-arquitetura--estrutura-do-projeto)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Começando](#-começando)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação](#instalação)
  - [Configuração de Ambiente](#configuração-de-ambiente)
- [Executando a Aplicação](#-executando-a-aplicação)
- [Testes Automatizados](#-testes-automatizados)
- [Referência da API (Rotas v1)](#-referência-da-api-rotas-v1)
- [Guia de Desenvolvimento & Padrões](#-guia-de-desenvolvimento--padrões)
- [Licença & Autor](#-licença--autor)

---

## 🎯 Visão Geral

Este repositório fornece um scaffold arquitetural robusto e pronto para produção, projetado para equipes que buscam excelência técnica, desacoplamento e alta performance.

Em vez do boilerplate padrão com Express e `class-validator`, o projeto adota o que há de mais moderno no ecossistema Node.js / TypeScript:

1. **NestJS 12 em ESM puro (`"type": "module"`)**: Importações nativas com extensões `.js`, alinhadas às especificações atuais do Node.js.
2. **Fastify Engine**: Alta taxa de transferência de requisições, baixa sobrecarga de CPU e memória, compressão HTTP nativa e headers de segurança via Helmet.
3. **Domain-Driven Design (DDD) & Clean Architecture**: Domínio rico isolado de frameworks, entidades com invariantes de negócio protegidas, Value Objects imutáveis e desacoplamento via Ports & Adapters.
4. **Standard Schema com Zod v4**: Validação e serialização tipadas de ponta a ponta através do novo padrão `StandardSchemaValidationPipe` e `StandardSchemaSerializerInterceptor` do NestJS 12.
5. **Autenticação Completa com `@nestjs/authentication`**: Sessões persistidas, tokens JWT (access + refresh), MFA (TOTP), recuperação de senha, confirmação de e-mail e proteções contra ataques de timing e credential-stuffing.
6. **Documentação OpenAPI & Swagger UI**: Documentação interativa em `/docs`, acompanhada de especificações em JSON (`/docs/json`) e YAML (`/docs/yaml`), integrando nativamente com schemas Zod e múltiplos esquemas de autorização (Bearer e Cookie de Sessão).
7. **100% de Cobertura de Código**: Todos os fluxos de aplicação, domínio, regras de negócio, infraestrutura de documentação e filtros de exceção são cobertos por testes unitários e E2E via Vitest e SWC.

---

## 🚀 Diferenciais & Recursos

### 🛡️ Autenticação & Segurança de Nível Bancário
- **Duplo Mecanismo de Autenticação**:
  - **Sessões HTTP**: Baseadas em cookies seguros com rastreamento de User-Agent, expiração absoluta (14 dias) e ociosa (3 dias), controle de múltiplas sessões ativas e invalidação remota individual ou global (`sign-out-everywhere`).
  - **JWT Bearer Tokens**: Emissão de par de tokens (Access Token com TTL de 15min + Refresh Token rotacionável), com endpoints para refresh e revogação imediata.
- **MFA / TOTP**: Enrolamento de autenticador em duas etapas com segredo OTP, confirmação, substituição segura e geração de **códigos de recuperação (recovery codes)**.
- **Proteção contra Timing Attacks**: Verificação de credenciais com tempo constante mesmo para usuários inexistentes, eliminando vazamento de enumeração de e-mails.
- **Rehashing Automático**: Senhas armazenadas com algoritmos antigos ou custo desatualizado são re-hasheadas automaticamente de forma transparente no login com sucesso (`needsRehash`).
- **Rate Limiting Avançado (`AuthThrottlerGuard`)**:
  - Limite estrito em rotas críticas (`sign-in`, `sign-up`, `mfa`, `reset-password`).
  - Proteção de burst por IP (`IP_BURST_MULTIPLIER = 4`).
  - Prevenção de credential-stuffing com tracking composto por e-mail normalizado e IP (`normalizedEmail|ip`).
- **Rastreabilidade com UUIDv7**: Geração e propagação de `x-request-id` através de identificadores UUID versão 7 ordenados cronologicamente, com sanitização de caracteres maliciosos.
- **Redação de Logs Sensíveis**: Mascaramento automático no Pino Logger de cabeçalhos de autorização, cookies, senhas e tokens com `[CONFIDENTIAL]`.

### 🧩 Validação & Serialização Elegante (Standard Schema)
- Totalmente baseado em **Zod v4**.
- Sem a necessidade de decoradores pesados do `class-validator` ou transformações imperfeitas do `class-transformer`.
- Mensagens de erro padronizadas e mapeadas em listas estruturadas (`details: [{ field, message }]`).

### 📦 Sistema de E-mail Desacoplado
- Integração com `@nestjs/mail` suportando transporte via **SMTP** (`SmtpTransport`) ou transporte em log de desenvolvimento (`LogMailTransport`).
- Templates HTML nativos (`verify-email.html`, `password-reset.html`) processados via `FileTemplateEngine` com cache automático em ambiente de produção.

### 📖 Documentação OpenAPI (Swagger) Nativa
- Interface interativa Swagger UI montada em `/docs`, compatível com Fastify e Security Headers (CSP).
- Exportação da especificação OpenAPI 3.0 nos formatos JSON (`/docs/json`) e YAML (`/docs/yaml`).
- Inferência automática de schemas de entrada e saída baseados em **Zod v4** (Standard Schema via `~standard.jsonSchema`).
- Suporte a múltiplos esquemas de segurança: Bearer Token JWT (`bearer`) e Cookie de Sessão persistida (`session`).
- Cobertura completa de códigos HTTP de sucesso (200, 201, 202, 204) e erros estruturados com `ErrorResponseDto` (400, 401, 403, 404, 409, 429).

---

## 🏛️ Arquitetura & Estrutura do Projeto

O projeto segue as diretrizes do **Domain-Driven Design (DDD)** e **Arquitetura Hexagonal**:

```
src/
├── app.module.ts              # Módulo raiz configurando Throttler, Mail, Auth e Env
├── main.ts                    # Bootstrap do Fastify, interceptors, pipes e filtros
│
├── core/                      # Camada Core transversal e agnóstica
│   └── domain/
│       └── errors/
│           └── domain.error.ts # Classe base DomainError e catálogo DomainErrorKind
│
├── infra/                     # Infraestrutura transversal
│   ├── config/env/            # Schema Zod para .env e serviço tipado EnvService
│   ├── docs/                  # Configuração do Swagger/OpenAPI e DTOs de erro
│   ├── http/
│   │   ├── filters/           # GlobalExceptionFilter (DomainError -> HTTP status)
│   │   ├── pipes/             # StandardSchemaValidationPipe configurado
│   │   └── utils/             # Utilitário de sanitização e geração do Request ID
│   ├── logging/               # LoggerModule com Pino e redação de credenciais
│   └── mail/templates/        # Templates HTML para e-mails transacionais
│
└── modules/                   # Módulos funcionais e Bounded Contexts
    ├── auth/                  # Contexto de Autenticação & Sessões
    │   ├── application/       # Serviços e Casos de Uso (CredentialsService)
    │   ├── domain/errors/     # Erros específicos (InvalidCredentials, InvalidMfaCode, etc.)
    │   └── infra/
    │       ├── http/          # Controllers (Auth, Tokens, Sessions, MFA, Email, Password)
    │       ├── http/dtos/     # Schemas Zod de entrada e saída
    │       ├── http/guards/   # AuthThrottlerGuard (Rate Limiting inteligente)
    │       ├── mail/          # Mailers transacionais com templates
    │       └── security/      # Provedores JwtAuth e SessionAuth
    │
    └── users/                 # Contexto de Usuários
        ├── domain/
        │   ├── entities/      # Entidade User com regras de negócio e mutações puras
        │   ├── value-objects/ # Objeto de Valor Email (imutável e validado)
        │   ├── ports/         # Porta USERS_REPOSITORY (Interface pura)
        │   └── errors/        # Erros de domínio do usuário
        └── infra/
            ├── database/
            │   ├── adapters/  # InMemoryUsersRepository (facilmente substituível por ORM)
            │   └── mappers/   # UserMapper (conversão Domínio <-> Persistência <-> HTTP)
            └── http/
                ├── controllers/# MeController
                └── dtos/      # Schemas de resposta de usuário
```

### Mapeamento de Erros de Domínio para HTTP

O `GlobalExceptionFilter` intercepta erros da hierarquia `DomainError` e realiza a tradução sem acoplar a camada de domínio aos detalhes do protocolo HTTP:

| `DomainErrorKind` | Código HTTP | Descrição |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | `400 Bad Request` | Falha de validação ou argumentos inconsistentes |
| `UNAUTHORIZED` | `401 Unauthorized` | Credenciais inválidas ou token expirado |
| `FORBIDDEN` | `403 Forbidden` | Acesso negado ao recurso solicitado |
| `ENTITY_NOT_FOUND` | `404 Not Found` | Entidade ou registro não localizado |
| `CONFLICT` | `409 Conflict` | Conflito de estado (ex: e-mail já cadastrado) |
| `BUSINESS_RULE_VIOLATION` | `422 Unprocessable Entity`| Violação de regra de negócio do domínio |

---

## 🛠️ Tecnologias Utilizadas

| Componente | Tecnologia | Versão |
| :--- | :--- | :--- |
| **Framework Web** | [NestJS](https://nestjs.com/) | `12.1.3` (ESM) |
| **Servidor HTTP** | [Fastify](https://fastify.dev/) | `^12.1.3` |
| **Runtime & Pacotes** | [Bun](https://bun.sh/) | `^1.2` |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | `6.0.3` |
| **Validação de Dados**| [Zod](https://zod.dev/) (Standard Schema) | `^4.6.7` |
| **Documentação OpenAPI**| [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) | `^12.0.2` |
| **Arquivos Estáticos Fastify**| [@fastify/static](https://github.com/fastify/fastify-static) | `^10.1.6` |
| **Autenticação** | [@nestjs/authentication](https://github.com/nestjs/authentication) | `^0.1.1` |
| **Logger Estruturado** | [Pino](https://getpino.io/) via `nestjs-pino` | `^5.3.1` |
| **Test Runner** | [Vitest](https://vitest.dev/) com SWC | `^5.0.5` |
| **Linter & Formatter**| [Biome](https://biomejs.dev/) | `2.5.15` |
| **Rate Limiter** | [@nestjs/throttler](https://github.com/nestjs/throttler) | `^6.7.1` |

---

## 🏁 Começando

### Pré-requisitos

- [Bun](https://bun.sh/) (versão `1.2` ou superior recomendada) ou [Node.js](https://nodejs.org/) (`22.x` / `24.x` / `26.x`).

### Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/bfukumori/nestjs-scaffold-ddd.git
cd nestjs-scaffold-ddd
bun install
```

### Configuração de Ambiente

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

Variáveis suportadas:

| Variável | Obrigatória | Padrão | Descrição |
| :--- | :---: | :--- | :--- |
| `PORT` | Não | `3001` | Porta em que o servidor Fastify irá escutar |
| `NODE_ENV` | Não | `development` | Ambiente (`development`, `production`, `test`) |
| `APP_URL` | Não | `http://localhost:3000` | URL base do cliente web para links de confirmação/reset |
| `JWT_SECRET` | **Sim** | — | Chave secreta para assinatura e validação dos tokens JWT |
| `TOTP_ENCRYPTION_KEY` | Não | — | Chave para encriptação dos segredos TOTP de MFA |
| `SMTP_URL` | Não | — | URL de conexão SMTP (se omitido, usa `LogMailTransport`) |

---

## 💻 Executando a Aplicação

```bash
# Modo de desenvolvimento com hot-reload
bun run start:dev

# Modo de depuração (debug)
bun run start:debug

# Build de produção otimizado com SWC
bun run build

# Execução em produção
bun run start:prod
```

A API estará disponível por padrão em: `http://localhost:3001/v1`

---

## 🧪 Testes Automatizados

A suíte de testes utiliza **Vitest** integrado com **SWC**, executando centenas de asserções em milissegundos com 100% de cobertura de código.

```bash
# Executa todos os testes unitários
bun run test

# Executa testes em modo interativo (watch)
bun run test:watch

# Gera o relatório completo de cobertura (v8)
bun run test:cov

# Executa os testes de ponta a ponta (E2E)
bun run test:e2e
```

### Verificação de Qualidade e Tipagem

```bash
# Executa a verificação e auto-correção com Biome
bun run lint

# Checagem de tipos com TypeScript Compiler
bun run typecheck
```

---

## 📡 Referência da API (Rotas v1)

Todas as rotas da aplicação são versionadas com o prefixo `/v1`. Os endpoints da documentação OpenAPI/Swagger estão disponíveis na raiz da aplicação.

### 📖 Documentação OpenAPI (Swagger)

| Método | Endpoint | Autenticação | Formato | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/docs` | Pública | HTML | Interface interativa Swagger UI |
| `GET` | `/docs/json` | Pública | JSON | Especificação OpenAPI 3.0 bruta em JSON |
| `GET` | `/docs/yaml` | Pública | YAML | Especificação OpenAPI 3.0 bruta em YAML |

### 🔐 Autenticação & Sessões

| Método | Endpoint | Autenticação | Rate Limit | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/v1/auth/sign-up` | Pública | 5 / 15m | Cria um novo usuário e envia e-mail de ativação |
| `POST` | `/v1/auth/sign-in` | Pública | 5 / 15m | Autentica com e-mail/senha e inicia sessão HTTP |
| `POST` | `/v1/auth/sign-out` | Pública / Sessão | — | Finaliza a sessão atual |
| `POST` | `/v1/auth/sign-out-everywhere` | Requerida | — | Revoga todas as sessões ativas do usuário |
| `GET` | `/v1/auth/sessions` | Requerida | — | Lista as sessões ativas e metadados (User-Agent) |
| `DELETE`| `/v1/auth/sessions/:id` | Requerida | — | Revoga uma sessão remota específica |

### 🎟️ Tokens JWT

| Método | Endpoint | Autenticação | Rate Limit | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/v1/auth/token` | Pública | 5 / 15m | Emite par de Access Token e Refresh Token |
| `POST` | `/v1/auth/token/refresh` | Pública | 10 / 1m | Renova o Access Token via Refresh Token |
| `POST` | `/v1/auth/token/revoke` | Pública | 10 / 1m | Revoga um Refresh Token |

### 🔑 Multi-Factor Authentication (MFA / TOTP)

| Método | Endpoint | Autenticação | Rate Limit | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/v1/auth/mfa/enroll` | Requerida | — | Inicia registro MFA e gera segredo TOTP |
| `POST` | `/v1/auth/mfa/replace` | Requerida (MFA) | — | Substitui o autenticador atual por um novo |
| `POST` | `/v1/auth/mfa/confirm` | Requerida | 5 / 15m | Confirma código e gera códigos de recuperação |
| `POST` | `/v1/auth/mfa/verify` | Pública | 5 / 15m | Resolve desafio MFA pendente no sign-in |

### 📧 E-mail & Senha

| Método | Endpoint | Autenticação | Rate Limit | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `PATCH` | `/v1/auth/email` | Requerida (MFA) | 3 / 15m | Altera o e-mail do usuário e envia verificação |
| `POST` | `/v1/auth/email/verify` | Pública | 10 / 15m | Confirma e valida token de e-mail |
| `POST` | `/v1/auth/email/verification`| Requerida | 3 / 15m | Reenvia link de confirmação de e-mail |
| `POST` | `/v1/auth/password/forgot` | Pública | 3 / 15m | Solicita link assinado para recuperação de senha |
| `POST` | `/v1/auth/password/reset` | Pública | 5 / 15m | Redefine a senha via token e encerra sessões |

### 👤 Usuários

| Método | Endpoint | Autenticação | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/v1/me` | Requerida | Retorna os dados do perfil do usuário autenticado |

---

## 💡 Guia de Desenvolvimento & Padrões

### Criando uma Nova Entidade de Domínio

1. Mantenha os atributos privados e exponha apenas *getters* ou métodos com significado de negócio.
2. Utilize construtor privado e exponha os métodos estáticos `create()` (para novas entidades) e `restore()` (para reidratação do banco de dados).
3. Nunca lance erros HTTP (`HttpException`) dentro da entidade. Lance subclasses de `DomainError`.

```typescript
import { DomainError } from "@src/core/domain/errors/domain.error.js";

export class OrderItemLimitExceededError extends DomainError {
  public readonly kind = "BUSINESS_RULE_VIOLATION";
  constructor() {
    super("An order cannot contain more than 100 items.");
  }
}
```

### Substituindo o Repositório em Memória por Prisma / TypeORM / Drizzle

1. O contrato do repositório é definido na interface `UsersRepository` (`src/modules/users/domain/ports/users.repository.ts`).
2. Crie seu adaptador em `src/modules/users/infra/database/adapters/<orm>/<orm>-users.repository.ts`.
3. Atualize o provedor em `UsersModule`:

```typescript
@Module({
  providers: [
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository, // ou DrizzleUsersRepository
    },
  ],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
```

---

## 📄 Licença & Autor

Distribuído sob a licença **MIT**. Consulte [`LICENSE`](./LICENSE) para obter mais informações.

Desenvolvido por **[Bruno Fukumori](https://github.com/bfukumori)** ([brunofukumori@gmail.com](mailto:brunofukumori@gmail.com)).
