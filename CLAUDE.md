# Mini TMS — guia para o Claude Code

Multi-tenant TMS (NestJS + Next.js) — portfolio project. Contexto completo de arquitetura e decisões: [`DESIGN.md`](./DESIGN.md); specs de tela: [`SCREENS.md`](./SCREENS.md); fluxo ponta-a-ponta: [`FLOW.md`](./FLOW.md). Leia essas fontes antes de propor mudanças estruturais — não são redundantes com este arquivo.

## Estrutura — dois projetos pnpm independentes

- `apps/api` — NestJS + Prisma (Postgres) + Redis (pub/sub, cache, BullMQ) + Socket.io.
- `apps/web` — Next.js (App Router) + TanStack Query + Zustand + Tailwind + shadcn.
- A raiz (`package.json` na raiz) **só** existe para tooling (lefthook, commitlint) — nunca adicione dependências de app aqui.
- Cada app tem seu próprio `tsconfig.json`. Se algo parecer com erro de TS fora de contexto (ex.: `strictPropertyInitialization` falso-positivo), é sinal de que o editor/LSP carregou o projeto errado — não é bug de código.

## Comandos

```bash
docker compose up -d              # Postgres (5432) + Redis (6379), infra local

# apps/api — http://localhost:3333
cd apps/api && pnpm install && pnpm start:dev   # roda `prisma migrate deploy` antes (prestart:dev)
pnpm test          # vitest unit
pnpm test:e2e      # vitest e2e (também roda migrate deploy antes)
pnpm lint          # biome check --write .
pnpm lint:ci       # biome check . (sem write — é o que roda no CI)

# apps/web — http://localhost:3000
cd apps/web && pnpm install && pnpm dev
pnpm test
pnpm lint
```

Instalação na raiz (`pnpm install`) só ativa lefthook/commitlint — não builda os apps.

## Convenções não-negociáveis

- **Lint/format:** Biome (não ESLint/Prettier) em ambos os apps — `pnpm lint` já aplica `--write`.
- **Commits:** Conventional Commits, validado por commitlint no hook `commit-msg` (lefthook). `pre-commit` roda `lint-staged` (Biome nos arquivos staged de cada app). Não use `--no-verify` para contornar.
- **Migrations Prisma** (`apps/api/prisma`): nunca edite uma migration já aplicada/commitada — gere uma nova com `prisma migrate dev`. `generated/` e `dist/` são build output, nunca editar à mão.
- **CI** (GitHub Actions, `.github/workflows/ci.yml`) roda lint + build + testes com Postgres real em todo push/PR para `main` — é a rede de segurança real, o hook local não garante nada para quem clona ou usa `--no-verify`.

## Domínio

Multi-tenant com RBAC em múltiplas camadas (admin / seller / carrier / operator). Antes de mexer em autorização ou nos módulos de `sellers`, `carriers` ou `shipments`, ver DESIGN.md § 10 (modelo de dados, 11 tabelas) e § 14 (matching de coverage+modalidade). Real-time (tracking) via Socket.io + Redis adapter — pensado para escalar horizontalmente entre múltiplas instâncias da API; não assuma um único processo.

## Subagents já configurados

`.claude/agents/nestjs-reviewer.md` e `.claude/agents/nextjs-reviewer.md` — use-os para revisão de código específica de cada app em vez de revisar tudo no fluxo principal.

## Status

Em desenvolvimento. Ver "Status" no `README.md` para o que já está implementado vs. no roadmap (`DESIGN.md § 7`) antes de assumir que um módulo existe ou está completo.
