# Mini TMS

Sistema de gestão de transporte (Transportation Management System) multi-tenant, com onboarding de sellers, gestão de transportadoras e rastreamento de entregas em tempo real.

Projeto de portfolio: não busca ser um produto comercializável, mas um artefato técnico que demonstra modelagem de domínio real, RBAC em múltiplas camadas e uma arquitetura de tempo real que escala horizontalmente (WebSocket + Redis pub/sub). Decisões de stack e arquitetura, com o porquê de cada uma, estão documentadas em [`DESIGN.md`](./DESIGN.md).

## Stack

- **Backend:** NestJS, PostgreSQL (Prisma), Redis (pub/sub, cache, BullMQ)
- **Frontend:** Next.js (App Router), TanStack Query, Zustand, Tailwind
- **Tempo real:** Socket.io com adapter Redis (escala entre múltiplas instâncias da API)
- **Infra local:** Docker Compose (Postgres + Redis)

## Estrutura

```
apps/
├── api/   # NestJS — backend
└── web/   # Next.js — frontend
```

Ver seção 8 e 9 do [`DESIGN.md`](./DESIGN.md) para a árvore de pastas completa e a lógica por trás dela. Especificação tela a tela (papéis, dados, ações) em [`SCREENS.md`](./SCREENS.md).

## Rodando localmente

```bash
# 1. Infra (Postgres + Redis)
docker compose up -d

# 2. Backend — http://localhost:3333 (generate + migrate rodam sozinhos)
cd apps/api
pnpm install
pnpm start:dev

# 3. Frontend — http://localhost:3000
cd apps/web
pnpm install
pnpm dev
```

Detalhes de configuração (`.env`, credenciais de dev, notas técnicas do Prisma) em [`DESIGN.md` § 8](./DESIGN.md#8-como-rodar-localmente).

## Qualidade de código

Biome (format + lint, um binário só nos dois apps) + lefthook (`pre-commit` roda lint-staged, `commit-msg` valida Conventional Commits). O `package.json` da raiz existe só pra hospedar esse tooling — `apps/api` e `apps/web` continuam projetos pnpm independentes. Racional completo (incluindo os dois gotchas reais do Biome com NestJS) em [`DESIGN.md` § 12](./DESIGN.md#12-qualidade-de-código).

```bash
pnpm install   # na raiz — instala lefthook/lint-staged/commitlint e ativa os git hooks
```

## Status

Em desenvolvimento. Scaffold de backend e frontend prontos e validados; modelagem de domínio fechada ([`DESIGN.md` § 10](./DESIGN.md#10-modelo-de-dados), 11 tabelas, migration aplicada); `AuthModule` implementado e testado ponta a ponta ([`DESIGN.md` § 11](./DESIGN.md#11-arquitetura-de-módulos-do-backend)). Faltam: lógica dos módulos de domínio (sellers/carriers/shipments/tracking/notifications), features do frontend — acompanhe o [roadmap](./DESIGN.md#7-roadmap-features-avançadas--próximos-passos) e as seções de arquitetura no `DESIGN.md`.

## Licença

[MIT](./LICENSE)
