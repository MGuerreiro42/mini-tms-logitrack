# Mini TMS — API

Backend do [Mini TMS](../../README.md), em NestJS. Racional completo das decisões de arquitetura em [`DESIGN.md`](../../DESIGN.md) na raiz do repo — este README cobre só o que é específico deste app.

## Stack

- NestJS 11
- PostgreSQL via Prisma 7, com driver adapter (`@prisma/adapter-pg`)
- Redis (pub/sub, cache, BullMQ) — integração ainda pendente
- Socket.io — gateway de tempo real ainda pendente

## Rodando

```bash
# infra (na raiz do repo)
docker compose up -d

# aqui — postinstall roda `prisma generate`, prestart:dev roda `prisma migrate deploy`
pnpm install
pnpm start:dev   # http://localhost:3333
```

Alterar `schema.prisma` e gerar uma migration nova continua manual, de propósito: `pnpm exec prisma migrate dev --name <nome>`.

## Estrutura

```
src/
├── modules/
│   ├── auth/            # implementado — Passport + JWT + bcrypt (ver DESIGN.md § 11)
│   ├── sellers/         # self-signup implementado (ver DESIGN.md § 16); resto ainda skeleton
│   ├── carriers/        # skeleton (+ invites/ aninhado)
│   ├── shipments/       # skeleton
│   ├── tracking/        # skeleton — vira Gateway WS + Redis adapter
│   └── notifications/   # skeleton — vira workers BullMQ
├── shared/
│   ├── prisma/          # PrismaModule + PrismaService — @Global()
│   └── password/        # PasswordService (bcrypt hash/compare) — @Global()
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma     # 11 models — ver DESIGN.md § 10
├── seed.ts           # cria o Admin — `pnpm exec prisma db seed`
└── migrations/       # versionadas no git, aplicadas via `prisma migrate deploy`
```

Agrupado por domínio, não por camada técnica — mesma filosofia do front (`DESIGN.md` § 9). Só `auth/` tem lógica de verdade; os demais são esqueletos prontos pra receber implementação módulo a módulo.

## Testando o login

```bash
pnpm exec prisma db seed   # cria admin@minitms.dev / admin12345 (ou ADMIN_EMAIL/ADMIN_PASSWORD)

curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@minitms.dev","password":"admin12345"}'

curl http://localhost:3333/auth/me -H "Authorization: Bearer <accessToken>"
```

## Testando o self-signup de seller

```bash
curl -X POST http://localhost:3333/sellers \
  -H "Content-Type: application/json" \
  -d '{"email":"loja@exemplo.com","password":"senha12345","companyName":"Loja Exemplo LTDA","document":"12345678000199"}'
```

Cria `User` (role `SELLER`) + `Seller` (`status: PENDING`) numa transação. Email/documento duplicado retorna 409. Aprovação pelo admin ainda não existe — próximo passo.

## Testes

```bash
pnpm test        # unitários (vitest run)
pnpm test:watch  # unitários, watch mode
pnpm test:cov    # com cobertura (@vitest/coverage-v8)
pnpm test:e2e    # sobe o AppModule inteiro + Postgres real, via supertest
```

Vitest, não Jest — o transform padrão dele não implementa `emitDecoratorMetadata` (usado pelo Nest pra resolver DI), então tem um plugin SWC configurado nos dois `vitest.config*.ts` especificamente pra isso. Detalhes e o porquê em [`DESIGN.md` § 12](../../DESIGN.md#12-qualidade-de-código).

## Lint & format

```bash
pnpm lint     # biome check --write .
pnpm format   # biome format --write .
```

Biome, não ESLint/Prettier — gotchas específicos do NestJS (parameter decorators, `useImportType` quebrando DI) em [`DESIGN.md` § 12](../../DESIGN.md#12-qualidade-de-código). Roda automaticamente no `pre-commit` (lefthook, configurado na raiz do repo).

## Documentação da API

```bash
pnpm start:dev
# abrir http://localhost:3333/docs
```

Swagger/OpenAPI via `@nestjs/swagger`. Só `auth/` está documentado — os módulos esqueleto não têm contrato real ainda, documentar não faria sentido. Detalhes em [`DESIGN.md` § 15](../../DESIGN.md#15-openapi-swagger-e-versão-do-node).

## Nota técnica — Prisma 7

O generator usa `moduleFormat = "cjs"` no `schema.prisma` — o padrão da v7 gera um client ESM-only (`import.meta.url`), incompatível com o build CommonJS do Nest. O client também exige um driver adapter explícito no construtor (`PrismaService` passa `new PrismaPg({ connectionString: ... })`), em vez de resolver a conexão implicitamente a partir de `DATABASE_URL`. Detalhes em [`DESIGN.md` § 8](../../DESIGN.md#8-como-rodar-localmente).

## Variáveis de ambiente

Validadas na subida via Zod (`src/shared/config/env.validation.ts`) — falta ou valor inválido derruba a aplicação com mensagem clara em vez de erro confuso mais tarde. Detalhes em [`DESIGN.md` § 14](../../DESIGN.md#14-validação-de-ambiente-e-cors).

| Var | Default | Descrição |
|---|---|---|
| `DATABASE_URL` | — | connection string do Postgres (ver `docker-compose.yml` na raiz) |
| `PORT` | `3333` | porta do servidor — Next.js usa 3000 por padrão |
| `JWT_SECRET` | — | assinatura dos tokens — trocar em produção, mínimo 16 caracteres |
| `CORS_ORIGIN` | `http://localhost:3000` | única origem liberada pro CORS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@minitms.dev` / `admin12345` | credenciais do seed do Admin |
