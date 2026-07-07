# Mini TMS — Design Doc

> Sistema de gestão de transporte (Transportation Management System) simplificado, cobrindo onboarding de sellers, gestão multi-tenant de transportadoras e tracking de entregas em tempo real.

---

## 1. Objetivo do projeto

Construir um sistema full-stack que reflita, de forma simplificada mas arquiteturalmente honesta, os desafios reais de uma plataforma de logística: múltiplos tipos de organização interagindo (sellers e transportadoras), aprovação e onboarding controlados, rastreamento de entregas em tempo real, e multi-tenancy de verdade — não um CRUD genérico com autenticação.

O projeto não busca ser um produto comercializável, mas um artefato técnico que demonstre:

- Modelagem de domínio com relacionamentos reais (não um schema de tutorial).
- Autorização em múltiplas camadas (RBAC aplicado no backend, não só escondendo botão no front).
- Arquitetura de tempo real que escala horizontalmente (WebSocket + Redis pub/sub), não um `socket.emit` solto.
- Decisões técnicas justificadas — cada escolha de stack tem um porquê documentado, não é "porque é o que todo mundo usa".

## 2. Papéis do sistema

| Papel | Quem é | Como entra no sistema |
|---|---|---|
| **Admin** | Dono da plataforma | Nasce via seed, nunca via tela pública |
| **Seller** | Lojista que precisa despachar produtos | Self-signup público → onboarding → aprovação |
| **Carrier (gestor)** | Responsável pela transportadora | Cadastro da empresa → aprovação do admin |
| **Carrier (operador)** | Executa as entregas no dia a dia | Convite por token, enviado pelo gestor da carrier |

A decisão de separar Carrier em empresa + operadores (em vez de um único login por transportadora) foi deliberada: reflete como sistemas B2B reais lidam com múltiplos funcionários de uma mesma organização, e é o que torna o multi-tenancy genuíno em vez de só um campo `role` na tabela de usuário.

## 3. Jornada do usuário

Fluxo completo por papel, incluindo os pontos de entrada (self-signup vs. convite vs. seed) e as telas de cada etapa.

```mermaid
flowchart TD
    subgraph ENTRADA["🔑 Entrada no Sistema"]
        Login[/"Login"/]
        SignupSeller[/"Cadastro Seller (público)"/]
        InviteAccept[/"Aceite de Convite (token)"/]
        PublicTracking[/"Rastreio Público (sem login)"/]
    end

    Login -->|"role: admin"| AdminDash
    Login -->|"role: seller"| SellerCheck{"Status aprovado?"}
    Login -->|"role: carrier_manager / carrier_operator"| CarrierDash

    SignupSeller --> SellerOnboarding
    InviteAccept -->|"cria conta vinculada ao carrier_id do token"| CarrierDash

    subgraph ADMIN["👤 Admin"]
        AdminDash["Dashboard Geral"]
        SellersList["Lista de Sellers"]
        SellerDetail["Detalhe do Seller"]
        CarriersList["Lista de Carriers"]
        CarrierDetail["Detalhe da Carrier"]
        OperatorsMgmt["Gestão de Operadores"]
        GlobalMonitor["Monitoramento Global"]

        AdminDash --> SellersList --> SellerDetail
        SellerDetail -->|"aprovar / rejeitar"| SellersList
        AdminDash --> CarriersList --> CarrierDetail --> OperatorsMgmt
        CarrierDetail -->|"aprovar / rejeitar empresa"| CarriersList
        OperatorsMgmt -->|"convidar operador"| InviteAccept
        AdminDash --> GlobalMonitor
    end

    subgraph SELLER["🏪 Seller"]
        SellerOnboarding["Onboarding Multi-step<br/>(dados → docs → modalidades)"]
        SellerPending["Aguardando Aprovação"]
        SellerDash["Dashboard"]
        CreateShipment["Criar Envio"]
        ShipmentsList["Lista de Envios"]
        ShipmentDetail["Detalhe do Envio"]
        DeliveryConfig["Config. de Modalidades"]

        SellerOnboarding --> SellerPending --> SellerCheck
        SellerCheck -->|"sim"| SellerDash
        SellerCheck -->|"não"| SellerPending
        SellerDash --> CreateShipment --> ShipmentsList
        SellerDash --> ShipmentsList --> ShipmentDetail
        SellerDash --> DeliveryConfig
    end

    subgraph CARRIER["🚚 Carrier (Empresa)"]
        CarrierOnboarding["Cadastro da Empresa"]
        CarrierPendingApproval["Aguardando Aprovação"]
        CarrierDash["Dashboard / Fila Compartilhada<br/>(todos veem tudo)"]
        ClaimCheck{"Envio já tem dono?"}
        Claim["Assumir Envio"]
        ViewOnly["Somente visualização"]
        UpdateStatus["Atualizar Status"]
        Performance["Performance da Carrier"]

        CarrierOnboarding --> CarrierPendingApproval
        CarrierDash --> ClaimCheck
        ClaimCheck -->|"não tem dono"| Claim
        ClaimCheck -->|"dono sou eu"| UpdateStatus
        ClaimCheck -->|"dono é outro operador"| ViewOnly
        Claim --> UpdateStatus
        CarrierDash --> Performance
    end

    ShipmentDetail -.->|"tempo real (SSE/WebSocket)"| GlobalMonitor
    UpdateStatus -.->|"evento de status"| ShipmentDetail
    UpdateStatus -.->|"evento de status"| GlobalMonitor
    UpdateStatus -.->|"evento de atribuição"| GlobalMonitor
    ShipmentDetail -.->|"link público"| PublicTracking
```

**Decisão de produto — atribuição de entregas:** a fila de envios é compartilhada dentro de cada carrier (todos os operadores veem tudo), mas cada envio tem um "dono" opcional. Sem dono, qualquer operador pode assumir (`self-assign`); com dono, só o próprio dono (ou o gestor, para destravar operação) pode agir. Isso prioriza transparência operacional sobre isolamento rígido de fila — reflete melhor como pequenas/médias transportadoras trabalham na prática.

## 4. Telas do sistema

**Admin:** Dashboard, Lista de Sellers, Detalhe de Seller, Lista de Carriers, Detalhe de Carrier (com sub-lista de operadores e convites), Monitoramento Global.

**Seller:** Onboarding (multi-step com draft), Dashboard, Criar Envio, Lista de Envios, Detalhe de Envio, Configuração de Modalidades.

**Carrier:** Cadastro da Empresa, Gestão de Operadores (só gestor vê), Aceite de Convite, Dashboard/Fila, Atualização de Status, Performance.

**Público:** Aceite de Convite, Rastreio sem login.

Especificação detalhada tela a tela — papel, dados exibidos (campos reais do schema), ações e estados — em [`SCREENS.md`](./SCREENS.md).

## 5. Arquitetura técnica

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Cliente"]
        Browser["Browser<br/>React + Next.js (App Router)<br/>shadcn/ui + Tailwind + Zustand"]
    end

    subgraph EDGE["🌐 Edge / Deploy"]
        Vercel["Next.js Frontend<br/>(Vercel)"]
        LB["Load Balancer<br/>(Railway/Fly.io — se escalar)"]
    end

    Browser -->|"HTTPS (REST)"| Vercel
    Browser -->|"WSS (Socket.io)"| LB
    Vercel -->|"REST API calls"| LB

    subgraph API["⚙️ Backend — NestJS"]
        RestModules["Módulos REST<br/>(Auth, Sellers, Carriers,<br/>Shipments, Invites)"]
        Guards["Guards / RBAC<br/>(@Roles decorator)"]
        Gateway["WebSocket Gateway<br/>(Socket.io)"]
        RedisAdapter["Redis Adapter<br/>(@socket.io/redis-adapter)"]
    end

    LB --> RestModules
    LB --> Gateway
    RestModules --> Guards
    Gateway --> RedisAdapter

    subgraph DATA["💾 Dados"]
        Postgres[("PostgreSQL<br/>via Prisma ORM<br/><br/>seller, carrier,<br/>carrier_user, shipment,<br/>tracking_event, invite")]
        Redis[("Redis<br/><br/>• Pub/Sub (eventos WS)<br/>• Cache (zonas, config)<br/>• BullMQ (filas)")]
    end

    RestModules -->|"CRUD / transações"| Postgres
    RestModules -->|"enfileira job"| Redis
    RedisAdapter <-->|"pub/sub cross-instance"| Redis

    subgraph WORKERS["🔄 Workers Assíncronos (BullMQ)"]
        EmailWorker["Worker: E-mail<br/>(convite, aprovação)"]
        NotifyWorker["Worker: Notificação<br/>(SLA estourado)"]
    end

    Redis -->|"consome fila"| EmailWorker
    Redis -->|"consome fila"| NotifyWorker

    subgraph EXTERNAL["📡 Externos"]
        MapAPI["Mapbox / Google Maps API<br/>(geocoding + rota)"]
        EmailProvider["Provedor de E-mail<br/>(Resend/SendGrid)"]
    end

    RestModules -.->|"geocoding"| MapAPI
    EmailWorker -.->|"envio"| EmailProvider

    RestModules -->|"1. operador atualiza status"| Postgres
    RestModules -->|"2. grava tracking_event"| Postgres
    RestModules -->|"3. publica evento"| Redis
    Redis -->|"4. propaga"| RedisAdapter
    RedisAdapter -->|"5. emite via WSS"| Gateway
    Gateway -.->|"6. push em tempo real"| Browser
```

### Fluxo de tempo real (o núcleo técnico do projeto)

1. Operador atualiza o status de um envio via REST.
2. Backend grava um novo `tracking_event` no Postgres (histórico imutável — nunca sobrescreve o status anterior).
3. Backend publica o evento num canal Redis.
4. Redis propaga o evento para todas as instâncias da API inscritas (é isso que permite escalar horizontalmente sem perder mensagens entre servidores diferentes).
5. O adapter de Redis entrega o evento ao WebSocket Gateway correspondente.
6. O Gateway emite via WSS para os clientes conectados (seller acompanhando o envio, admin no monitoramento global).

## 6. Decisões de stack — por quê

| Camada | Escolha | Alternativa considerada | Por quê |
|---|---|---|---|
| Backend | NestJS (Node) | Spring Boot (Java) | Real-time é o core do projeto — WebSocket é nativo em Node, sem exigir WebFlux para I/O não-bloqueante. Também é onde tenho mais fluência de dia a dia; Java eu manejo mas sem profundidade de produção. NestJS aproxima a estrutura de módulos/DI do que Spring oferece, o que mantém a porta aberta pra falar de arquitetura em entrevista mesmo com quem vem de Java. |
| Banco | PostgreSQL + Prisma | MongoDB | Domínio com relacionamento forte (seller → shipment → tracking_event → carrier) e necessidade de integridade transacional. NoSQL resolveria um problema de escala horizontal massiva ou schema flexível que este projeto não tem. |
| Tempo real | WebSocket (Socket.io) + Redis pub/sub | SSE puro / polling | Socket.io com adapter Redis permite escalar para múltiplas instâncias sem perder mensagens entre servidores — arquitetura pensada para produção real, não só uma demo de um único processo. |
| Fila | BullMQ (sobre Redis) | RabbitMQ/SQS | Reaproveita a mesma infra de Redis já necessária para pub/sub, evitando um serviço extra só para filas leves (e-mail de convite, alertas de SLA). |
| Frontend | React + Next.js | — | Padrão de mercado, App Router para rotas por papel (admin/seller/carrier) com layouts distintos. |
| Design system | shadcn/ui + Tailwind (Radix por baixo) | MUI | MUI já é ferramenta do dia a dia no trabalho — replicense não mostra nada novo. shadcn/ui virou padrão de facto em projetos React/Next.js modernos, e construir componentes de tabela/dashboard densos em cima de primitivas headless prova entendimento de design system, não só consumo de biblioteca pronta. |
| Infra | Docker Compose local, deploy em Railway/Fly.io | AWS completo | Custo e velocidade de setup adequados a portfólio, sem abrir mão de containerização real. |

## 7. Roadmap (features avançadas / próximos passos)

Itens fora do escopo do MVP mas documentados como evolução planejada — sinaliza visão de produto além do que foi entregue:

- Atribuição automática por regra (round-robin ou zona de cobertura do operador).
- Motor de roteirização (sugestão de ordem ótima de entregas).
- Previsão de atraso via modelo simples de dados históricos.
- Assistente em linguagem natural consultando métricas ("quantas entregas atrasadas essa semana").
- Multi-tenancy com isolamento de dados por rate limiting dedicado.

## 8. Como rodar localmente

### Estrutura do repositório

```
tms/
├── DESIGN.md
├── docker-compose.yml       # infra local: Postgres + Redis
└── apps/
    ├── api/                 # NestJS — backend
    │   ├── prisma/schema.prisma
    │   ├── src/prisma/      # PrismaModule + PrismaService (global)
    │   └── .env             # DATABASE_URL (não versionado)
    └── web/                 # Next.js — frontend
```

Monorepo simples por pastas (`apps/api`, `apps/web`), cada um com seu próprio `package.json`/lockfile — sem tooling de monorepo (Turborepo/Nx) por enquanto, já que os dois apps ainda não compartilham código entre si. Isso é revisitado se/quando surgir necessidade real de pacote compartilhado (ex.: tipos de DTO entre front e back).

### Infra (Postgres + Redis)

```bash
docker compose up -d
```

Sobe dois serviços com healthcheck e volume nomeado (dados sobrevivem a um `down`/`up`):

| Serviço | Porta | Credenciais (dev) |
|---|---|---|
| `postgres` (postgres:16-alpine) | `localhost:5432` | `tms` / `tms` / db `tms` |
| `redis` (redis:7-alpine) | `localhost:6379` | sem senha |

### Backend (`apps/api`)

```bash
cd apps/api
pnpm install       # postinstall roda `prisma generate` sozinho
pnpm start:dev     # prestart:dev roda `prisma migrate deploy` sozinho — http://localhost:3333
```

O `.env` já aponta pra infra do compose (`DATABASE_URL="postgresql://tms:tms@localhost:5432/tms?schema=public"`) e fixa `PORT=3333`, já que o Next.js também usa 3000 por padrão — os dois dev servers rodam ao mesmo tempo sem conflito.

**Migrations — o que é automático e o que não é.** O `docker-compose.yml` só sobe um Postgres vazio; ele não sabe nada sobre Prisma. Quem aplica o schema é o Prisma, e isso está automatizado via hooks do npm/pnpm no `package.json` do `apps/api`:
- `postinstall` → `prisma generate` (sempre que instalar dependências, o client fica em dia).
- `prestart` / `prestart:dev` / `prestart:prod` → `prisma migrate deploy` (aplica migrations já commitadas em `prisma/migrations/`, de forma não-interativa e segura — nunca cria migration nova nem reseta dado).

Isso cobre "banco vazio → schema aplicado sozinho ao rodar `pnpm start:dev`". O que **continua manual, de propósito**: alterar `schema.prisma` e gerar uma migration nova é sempre `pnpm exec prisma migrate dev --name <nome>` — um passo deliberado, não automatizado, porque envolve decidir o nome/conteúdo da migration.

**Nota técnica — Prisma 7 e driver adapters:** a partir da v7, o Prisma trocou o client gerado por engine Rust implícita por uma arquitetura de *driver adapters*: o `PrismaClient` recebe explicitamente um adapter (`@prisma/adapter-pg`, sobre `pg`) construído com a connection string, em vez de resolver a conexão sozinho a partir de `DATABASE_URL`. Duas implicações práticas registradas aqui porque não são óbvias vindo de versões anteriores do Prisma:
- O generator precisa de `moduleFormat = "cjs"` explícito no `schema.prisma` — o padrão da v7 gera um client ESM-only (usa `import.meta.url`), incompatível com o build CommonJS padrão do Nest.
- `PrismaService` (`src/prisma/prisma.service.ts`) estende `PrismaClient` passando o adapter no `constructor`, e implementa `OnModuleInit`/`OnModuleDestroy` pra conectar/desconectar junto do ciclo de vida do Nest. É um `@Global()` module, então qualquer módulo futuro injeta `PrismaService` sem reimportar.

### Frontend (`apps/web`)

```bash
cd apps/web
pnpm install
pnpm dev                    # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` (em `.env.local`) aponta pra API em `http://localhost:3333`. Ainda sem o design system definitivo (shadcn/ui) — isso é o próximo passo depois da estrutura de pastas descrita abaixo.

## 9. Arquitetura do frontend

Estrutura inspirada em [bulletproof-react](https://github.com/alan2207/bulletproof-react), adaptada ao domínio do TMS. A ideia central: organizar por **domínio de negócio**, não por tipo técnico de arquivo — a pasta `features/sellers` tem tudo relacionado a sellers (componentes, hooks, chamadas de API, tipos); não existe uma pasta `hooks/` genérica cheia de hooks de features diferentes misturados.

```
apps/web/src/
├── app/                      # SÓ roteamento (App Router) — layouts, pages, route groups
│   ├── (admin)/              # dashboard, sellers, carriers, monitoring
│   ├── (seller)/             # dashboard, shipments, onboarding
│   ├── (carrier)/            # dashboard, operators
│   ├── invite/accept/        # aceite de convite (público, via token)
│   ├── track/                # rastreio público (sem login)
│   └── providers.tsx         # único client component na raiz — QueryClientProvider
├── features/                 # o core do projeto — um domínio por pasta
│   ├── auth/
│   ├── sellers/
│   ├── carriers/
│   ├── shipments/
│   ├── invites/
│   └── tracking/
│       ├── components/
│       ├── hooks/
│       ├── api/              # chamadas + tipos de resposta desse domínio
│       └── types.ts
├── components/                # UI verdadeiramente compartilhada (ui/ e common/)
├── hooks/                     # hooks genéricos, não ligados a nenhum domínio
├── lib/                       # utilitários agnósticos de domínio
│   ├── utils.ts               # cn() — clsx + tailwind-merge
│   └── query-client.ts        # factory do QueryClient (padrão App Router: singleton no browser, novo por request no servidor)
├── services/                  # clientes de infraestrutura externa
│   ├── api-client.ts          # wrapper fetch tipado sobre NEXT_PUBLIC_API_URL
│   └── websocket-client.ts    # singleton do socket.io-client (autoConnect: false)
├── store/
│   └── ui-store.ts            # Zustand — só estado genuinamente global de UI
└── types/                     # tipos compartilhados entre features
```

### A regra que evita a bagunça: dependência unidirecional

`shared (components/, lib/, hooks/) → features/ → app/`. Ou seja: `components/` e `lib/` nunca importam de `features/`; uma feature pode importar de shared mas nunca de outra feature diretamente; `app/` importa de `features/` pra compor as páginas. É o que impede `sellers/` de depender de `carriers/` que depende de `shipments/` que depende de `sellers/` de novo — o emaranhado que transforma "modular" em "modular só no nome".

Exceção prevista: `shipments` vai ser consumido tanto por `sellers` (cria e acompanha envio) quanto por `carriers` (atualiza status) — nesse caso ele é uma feature "mais shared" que as outras duas dependem, o que é aceitável desde que a dependência continue de mão única. **Pendente:** vale reforçar essa regra com lint (`eslint-plugin-boundaries` ou `import/no-restricted-paths`) quando as features começarem a ter conteúdo de verdade — hoje ainda são só esqueletos, então o lint não teria o que verificar.

### Onde mora o estado

Regra fixa: se o dado vem do servidor, é **TanStack Query**; se é estado de UI pura do client, é **Zustand** (ou `useState` local quando nem precisa ser global). Nunca guardar resposta de API dentro de Zustand — isso vira sincronização manual que o Query já resolve (cache, revalidação, invalidação após mutação). No TMS: lista de shipments, status de aprovação de seller, dados de carrier → tudo Query, via os arquivos `features/*/api/`. Filtro de tabela selecionado, sidebar aberta/fechada, tema → `store/ui-store.ts`.

### Server vs. Client Components

Por padrão, tudo é Server Component — só existe `'use client'` onde há interatividade real (formulário, WebSocket, hooks de estado). A prática adotada é empurrar o `'use client'` pras folhas da árvore: hoje só `app/providers.tsx` é client component (porque `QueryClientProvider` precisa de contexto React), e o `layout.tsx` raiz continua Server Component, só envolvendo `{children}` com `<Providers>`. Conforme as features ganharem componentes interativos (ex.: o componente que escuta o WebSocket de tracking), só eles viram client component — não a página ou o layout inteiro em volta.

### Status atual

Esqueleto de pastas criado e validado (`pnpm build` e `pnpm dev` rodando limpos). `@tanstack/react-query` e `zustand` instalados e conectados (`Providers`, `ui-store.ts`). `features/*` ainda vazias (`types.ts`, `api/index.ts`, `index.ts` placeholders) — modelagem de cada domínio é o próximo passo, feature por feature.

## 10. Modelo de dados

11 tabelas em `apps/api/prisma/schema.prisma`, aplicadas via `prisma migrate dev` contra o Postgres do compose. Auth (`User`) separada de perfil de domínio (`Seller`, `CarrierUser`) — o Admin é só um `User` com `role: ADMIN`, sem tabela própria.

```
User ──1:1── Seller ──1:N── Shipment ──N:1── DeliveryModality
  └──1:1── CarrierUser ──N:1── Carrier ──1:N── Invite
                                  ├──1:N── CarrierCoverageArea
                                  ├──1:N── CarrierModality ──N:1── DeliveryModality
                                  └──1:N── Shipment (owner opcional via CarrierUser)

Seller ──1:N── SellerModality ──N:1── DeliveryModality
Shipment ──1:N── TrackingEvent (histórico imutável, nunca UPDATE)
```

### Decisões que não estavam óbvias na primeira passada

- **Endereço em campos soltos, não `Json`** — `Shipment.addressCity`/`addressState`/etc. como colunas reais. Perde a conveniência de um blob único, mas ganha índice e busca por cidade/UF — que é exatamente o que a atribuição de carrier por cobertura (abaixo) precisa.
- **`ShipmentStatus` com 9 estados**, não 4 — `COLLECTED` marca a coleta física (sem isso, não dá pra distinguir "criado" de "já saiu do seller"); `FAILED_DELIVERY` + `RETURNED` cobrem a tentativa frustrada (sem eles, um envio que falha na entrega ficaria preso em `IN_TRANSIT` pra sempre). `CANCELLED` só é possível antes de `COLLECTED` — depois disso a única saída de exceção é `FAILED_DELIVERY → RETURNED`.
- **Atribuição de carrier por cobertura de cidade/UF, não geoespacial** — `CarrierCoverageArea` (`carrierId`, `state`, `city` nullable = "estado inteiro"). Na criação do envio, filtra carriers aprovadas cuja cobertura bate com o endereço; o seller escolhe entre as que aparecem. Geocoding/PostGIS fica pro roadmap (seção 7) — não é escopo do MVP.
- **Modalidades como catálogo configurável, não enum fixo** — a existência da tela "Configuração de Modalidades" (seção 4) só faz sentido se há algo pra configurar. `DeliveryModality` é o catálogo (`code`, `name`, `slaHours` — este último pensado pro alerta de SLA estourado do roadmap); `CarrierModality` e `SellerModality` são junções N:N — a carrier declara o que opera, o seller declara o que habilita. **Decisão deliberada:** a configuração do seller é independente da oferta real de carriers (o seller liga/desliga do catálogo inteiro, sem saber se hoje existe carrier compatível na região dele) — mais simples, e evita acoplar a tela de config ao estado de onboarding de carriers. Sem carrier compatível na criação do envio vira um estado vazio tratado ali, não uma restrição na tela de configuração.
- **`Shipment` aponta pra uma única `Carrier`** — a fila compartilhada (seção 3) é *dentro* de uma carrier já atribuída; o "sem dono" é só sobre qual *operador* assume via `CarrierUser.ownedShipments` (`ownerId` nullable), não sobre qual carrier.

Rascunho visual (ER completo + fluxo de status) documentado à parte durante a discussão de modelagem — este documento reflete a versão final aplicada na migration `20260707213521_init_domain`.
