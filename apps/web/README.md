# Mini TMS — Web

Frontend do [Mini TMS](../../README.md), em Next.js (App Router). Racional completo das decisões de arquitetura em [`DESIGN.md`](../../DESIGN.md) na raiz do repo — este README cobre só o que é específico deste app.

## Stack

- Next.js 16 (App Router, Turbopack)
- TanStack Query — estado de servidor
- Zustand — estado de UI (só o que é genuinamente global)
- Tailwind CSS
- shadcn/ui — planejado, ainda não integrado

## Rodando

Precisa da API rodando em paralelo (`apps/api`, porta `3333`).

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

`.env.local` já aponta `NEXT_PUBLIC_API_URL` para `http://localhost:3333`.

## Estrutura

```
src/
├── app/            # roteamento — route groups (admin)/(seller)/(carrier), + invite/accept, track
├── features/       # um domínio por pasta: auth, sellers, carriers, shipments, invites, tracking
├── components/     # UI compartilhada (ui/, common/)
├── lib/            # utils (cn), query-client
├── services/       # api-client (fetch), websocket-client (socket.io)
└── store/          # Zustand
```

## Regras da arquitetura

- Dependência de mão única: `shared → features → app`. Uma feature nunca importa outra feature diretamente — exceção documentada: `shipments`, consumido por `sellers` e `carriers`.
- Servidor → sempre TanStack Query. Estado de UI pura → Zustand. Nunca duplicar resposta de API em store.
- Server Components por padrão; `'use client'` só nas folhas da árvore (hoje, só `app/providers.tsx`).

Cada `features/*` ainda são placeholders (`types.ts`, `api/index.ts`, `index.ts` vazios) — modelagem por domínio é o próximo passo. Detalhes e racional completo em [`DESIGN.md` § 9](../../DESIGN.md#9-arquitetura-do-frontend).

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3333` | base URL da API |
