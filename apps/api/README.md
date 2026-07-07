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

# aqui
pnpm install
pnpm exec prisma generate
pnpm start:dev   # http://localhost:3333
```

## Estrutura

```
src/
├── prisma/          # PrismaModule + PrismaService — @Global(), injetável em qualquer módulo futuro
├── app.module.ts
└── main.ts
prisma/
└── schema.prisma    # ainda sem models — modelagem de domínio é o próximo passo
```

A arquitetura de módulos por domínio (`modules/auth`, `modules/sellers`, `modules/shipments`, etc., desacoplados via `EventEmitterModule` em vez de import direto entre módulos) está planejada mas ainda não implementada.

## Nota técnica — Prisma 7

O generator usa `moduleFormat = "cjs"` no `schema.prisma` — o padrão da v7 gera um client ESM-only (`import.meta.url`), incompatível com o build CommonJS do Nest. O client também exige um driver adapter explícito no construtor (`PrismaService` passa `new PrismaPg({ connectionString: ... })`), em vez de resolver a conexão implicitamente a partir de `DATABASE_URL`. Detalhes em [`DESIGN.md` § 8](../../DESIGN.md#8-como-rodar-localmente).

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `DATABASE_URL` | — | connection string do Postgres (ver `docker-compose.yml` na raiz) |
| `PORT` | `3333` | porta do servidor — Next.js usa 3000 por padrão |
