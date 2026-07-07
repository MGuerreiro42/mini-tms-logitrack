# Mini TMS — Especificação de Telas

Brief tela a tela pra alimentar ferramenta de design (Claude/Figma/etc.) com contexto real, não genérico. Baseado em [`DESIGN.md`](./DESIGN.md) §2–5 (papéis, jornada, telas) e §10 (modelo de dados) — os campos citados aqui são os nomes reais do `schema.prisma`, não placeholder.

Cada tela segue o mesmo formato: **Papel** (quem acessa) · **Objetivo** · **Dados** (campos reais exibidos) · **Ações** · **Estados** (vazio/carregando/erro quando relevante) · **Navegação**.

---

## Público (sem login)

### Login

- **Papel:** todos (admin, seller, carrier_manager, carrier_operator)
- **Objetivo:** autenticar e redirecionar pro dashboard certo conforme `User.role`.
- **Dados:** formulário — email, senha.
- **Ações:** entrar; "esqueci minha senha" (fora do MVP, mas deixar o link mudo é mais honesto que omitir).
- **Estados:** erro de credencial inválida; conta com `Seller.status`/`Carrier.status` = `PENDING` redireciona pra "Aguardando Aprovação" em vez de negar acesso genérico.
- **Navegação →** Dashboard do papel correspondente, ou tela de espera.

### Cadastro de Seller (self-signup)

- **Papel:** público (vira Seller)
- **Objetivo:** criar `User` (role `SELLER`) + `Seller` vinculado, status inicial `PENDING`.
- **Dados:** email, senha, `Seller.companyName`, `Seller.document` (CNPJ/CPF).
- **Ações:** criar conta → segue direto pro Onboarding.
- **Estados:** documento já cadastrado (`document` é `@unique`) → erro claro, não genérico.
- **Navegação →** Onboarding Multi-step.

### Aceite de Convite

- **Papel:** público (vira `CarrierUser`, role `CARRIER_OPERATOR`)
- **Objetivo:** validar `Invite.token`, criar `User` + `CarrierUser` vinculado ao `Invite.carrierId`.
- **Dados:** nome da carrier (via `Invite.carrier.companyName`), email pré-preenchido (`Invite.email`), formulário de senha.
- **Ações:** criar conta e aceitar.
- **Estados:** token expirado (`Invite.status = EXPIRED` ou `expiresAt` passado) → tela de erro específica, não um 404 genérico; token já aceito (`ACCEPTED`) → idem.
- **Navegação →** Dashboard/Fila da Carrier.

### Rastreio Público

- **Papel:** público, sem login
- **Objetivo:** acompanhar um envio pelo `Shipment.trackingCode`, sem expor dado sensível do seller.
- **Dados:** `status` atual (rótulo amigável do `ShipmentStatus`), `addressCity`/`addressState` (não o endereço completo), linha do tempo de `TrackingEvent` (status + `createdAt`, sem `note` interno).
- **Ações:** buscar por código.
- **Estados:** código não encontrado → mensagem clara; nenhum evento ainda (`PENDING` sem histórico) → estado "aguardando confirmação".
- **Navegação:** tela isolada, sem menu — pode ser aberta direto de um link compartilhado.

---

## Seller

### Onboarding Multi-step

- **Papel:** Seller recém-cadastrado
- **Objetivo:** completar `Seller` (dados → documentos → modalidades) antes da aprovação.
- **Dados:** steps — (1) dados da empresa, já parcialmente preenchidos do cadastro; (2) upload de documentos (fora do schema atual — anotar como gap, não modelado ainda); (3) `SellerModality` — habilitar quais `DeliveryModality` pretende oferecer.
- **Ações:** avançar/voltar entre steps, salvar rascunho (draft), enviar pra aprovação (`Seller.status: PENDING → PENDING` com onboarding completo — status de aprovação não muda sozinho, só o admin aprova).
- **Estados:** rascunho salvo parcialmente (retomar de onde parou); step com erro de validação.
- **Navegação →** Aguardando Aprovação.

### Aguardando Aprovação

- **Papel:** Seller com `status = PENDING`
- **Objetivo:** comunicar que a conta está em análise, sem acesso ao dashboard ainda.
- **Dados:** status textual, talvez data de envio do onboarding.
- **Ações:** nenhuma — tela de espera pura (talvez "editar dados enviados", fora do MVP).
- **Navegação:** ao ser aprovado (`status = APPROVED`), próximo login já cai no Dashboard.

### Dashboard (Seller)

- **Papel:** Seller aprovado
- **Objetivo:** visão geral dos envios do seller.
- **Dados:** contagem de `Shipment` por `status` (quantos `PENDING`, `IN_TRANSIT`, `DELIVERED` etc.), atalho pros últimos envios.
- **Ações:** criar envio; ver lista completa.
- **Estados:** zero envios ainda → estado vazio com CTA pra criar o primeiro.
- **Navegação →** Criar Envio · Lista de Envios · Configuração de Modalidades.

### Criar Envio

- **Papel:** Seller aprovado
- **Objetivo:** criar um `Shipment` — é a tela mais "carregada" de lógica de negócio do fluxo do seller.
- **Dados de entrada:** endereço de destino (`addressStreet`, `addressNumber`, `addressComplement`, `addressNeighborhood`, `addressCity`, `addressState`, `addressZipCode`); modalidade — dropdown vindo só das `SellerModality` habilitadas (não o catálogo `DeliveryModality` inteiro).
- **Fluxo específico (não é só um form):** ao preencher cidade/UF + escolher modalidade, o sistema cruza `CarrierCoverageArea` (cobertura daquela cidade/UF) **e** `CarrierModality` (quem oferece a modalidade escolhida) **e** `Carrier.status = APPROVED` → mostra lista filtrada de carriers elegíveis pro seller escolher manualmente (não é atribuição automática, ver DESIGN.md §10).
- **Ações:** preencher endereço, escolher modalidade, escolher carrier da lista filtrada, confirmar (gera `trackingCode`, `status: PENDING`).
- **Estados:** **nenhuma carrier compatível** (cidade+modalidade sem match) → estado vazio explicando o motivo, não um erro genérico — é o caso de exceção mais importante dessa tela.
- **Navegação →** Detalhe do Envio recém-criado.

### Lista de Envios

- **Papel:** Seller
- **Objetivo:** listar/filtrar os próprios `Shipment`.
- **Dados:** `trackingCode`, `status` (badge/pill, um por estado do `ShipmentStatus`), `addressCity`/`addressState`, carrier atribuída, `createdAt`.
- **Ações:** filtrar por status; abrir detalhe.
- **Estados:** vazio (nenhum envio ainda).
- **Navegação →** Detalhe do Envio.

### Detalhe do Envio (visão Seller)

- **Papel:** Seller (dono do envio via `sellerId`)
- **Objetivo:** acompanhar um envio específico em tempo real.
- **Dados:** todos os campos do `Shipment` + linha do tempo completa de `TrackingEvent` (status, `note`, `createdAt`) + link de rastreio público pra compartilhar.
- **Ações:** copiar link de rastreio; (cancelar, só se `status` ainda permitir — `PENDING`/`ACCEPTED`, ver regra do §10).
- **Estados:** atualização de status chega via WebSocket em tempo real (ver DESIGN.md §5) — a tela deve refletir a mudança sem reload.
- **Navegação:** volta pra Lista de Envios.

### Configuração de Modalidades

- **Papel:** Seller
- **Objetivo:** ligar/desligar quais `DeliveryModality` o seller oferece — é a tela que justifica `SellerModality` existir como tabela própria (DESIGN.md §10).
- **Dados:** catálogo inteiro de `DeliveryModality` (`code`, `name`), com toggle indicando se está em `SellerModality` pra esse seller.
- **Ações:** habilitar/desabilitar cada modalidade.
- **Estados:** **importante:** essa tela não reflete se existe carrier compatível — é decisão do seller, independente da oferta real (decisão registrada no §10). Não colocar aviso do tipo "nenhuma carrier oferece isso" aqui — isso apareceria na tela de Criar Envio, não aqui.

---

## Carrier

### Cadastro da Empresa

- **Papel:** público (vira `CarrierUser` role `CARRIER_MANAGER`)
- **Objetivo:** criar `User` (role `CARRIER_MANAGER`) + `Carrier` + `CarrierUser` vinculando os dois, status inicial `PENDING`.
- **Dados:** email/senha do gestor, `Carrier.companyName`, `Carrier.document`.
- **Ações:** criar conta.
- **Navegação →** Aguardando Aprovação (mesma tela conceitual do seller, reaproveitável).

### Dashboard / Fila Compartilhada

- **Papel:** `CARRIER_MANAGER` e `CARRIER_OPERATOR` (mesma tela, ações variam)
- **Objetivo:** fila de `Shipment` atribuídos à `Carrier` — **todos os operadores veem tudo** (fila compartilhada, DESIGN.md §3).
- **Dados:** por linha — `trackingCode`, `status`, `addressCity`, modalidade, `owner` (nome do `CarrierUser` dono, ou "sem dono").
- **Ações — dependem de quem é o dono (`ownerId`):**
  - sem dono → qualquer operador pode **assumir** (`self-assign`, seta `ownerId`);
  - dono é quem está logado → pode **atualizar status** (avança no `ShipmentStatus`, grava novo `TrackingEvent`);
  - dono é outro operador → **somente visualização** (exceto o gestor, que pode agir em qualquer envio da carrier pra destravar operação).
- **Estados:** fila vazia; atualização em tempo real quando outro operador assume/atualiza um envio (WebSocket).
- **Navegação →** Detalhe do Envio (visão carrier) · Gestão de Operadores (só gestor) · Performance.

### Detalhe do Envio (visão Carrier)

- **Papel:** `CarrierUser` da carrier atribuída
- **Objetivo:** mesma tela de dados do envio, mas com os controles de ação da fila (assumir, atualizar status) em vez de "cancelar".
- **Dados:** iguais ao Detalhe do Envio do seller, mais os dados do seller (nome, contato) que o seller não precisa ver de si mesmo.
- **Ações:** assumir envio (se sem dono); atualizar `status` — a transição precisa respeitar a máquina de estados do §10 (ex.: não pode pular de `PENDING` direto pra `DELIVERED`; `CANCELLED` só antes de `COLLECTED`).

### Gestão de Operadores

- **Papel:** só `CARRIER_MANAGER` — regra de RBAC importante, não é tela do operador comum.
- **Objetivo:** convidar novos operadores e ver quem já faz parte da carrier.
- **Dados:** lista de `CarrierUser` (role `CARRIER_OPERATOR`) da carrier; lista de `Invite` pendentes (`status = PENDING`, `expiresAt`).
- **Ações:** convidar (cria `Invite`, dispara e-mail — worker BullMQ do §5); revogar convite pendente.
- **Estados:** convite expirado aparece diferenciado (não some da lista, mostra como expirado).

### Performance da Carrier

- **Papel:** `CARRIER_MANAGER` e `CARRIER_OPERATOR`
- **Objetivo:** métricas agregadas — quantos `Shipment` por `status`, tempo médio entre `TrackingEvent`s (proxy de SLA), taxa de `FAILED_DELIVERY`/`RETURNED`.
- **Dados:** agregações sobre `Shipment`/`TrackingEvent` filtradas por `carrierId` — sem dado de outras carriers (isolamento multi-tenant).
- **Estados:** sem dado suficiente ainda (carrier nova, poucos envios).

---

## Admin

### Dashboard Geral

- **Papel:** Admin
- **Objetivo:** visão executiva da plataforma inteira.
- **Dados:** contagem de sellers/carriers por `ApprovalStatus`, total de `Shipment` por `ShipmentStatus`, aprovações pendentes em destaque (é a ação mais frequente do admin).
- **Ações:** atalho direto pra fila de aprovações.
- **Navegação →** Lista de Sellers · Lista de Carriers · Monitoramento Global.

### Lista de Sellers

- **Papel:** Admin
- **Dados:** `companyName`, `document`, `status`, `createdAt`.
- **Ações:** filtrar por status (fila de `PENDING` é a visão default, já que é a ação recorrente).
- **Navegação →** Detalhe do Seller.

### Detalhe do Seller

- **Papel:** Admin
- **Dados:** todos os campos do `Seller` + dados do onboarding + `SellerModality` habilitadas + lista de `Shipment` recentes.
- **Ações:** **aprovar / rejeitar** (`status: PENDING → APPROVED/REJECTED`).
- **Estados:** já aprovado/rejeitado — ação vira só histórico, sem botão ativo.

### Lista de Carriers

- **Papel:** Admin
- **Dados:** `companyName`, `document`, `status`, quantidade de `CarrierUser`, `createdAt`.
- **Ações:** filtrar por status.
- **Navegação →** Detalhe da Carrier.

### Detalhe da Carrier

- **Papel:** Admin
- **Dados:** campos da `Carrier` + `CarrierCoverageArea` (lista de cidades/UF cobertas) + `CarrierModality` (o que opera) + sub-lista de `CarrierUser` (gestor + operadores) + `Invite`s pendentes.
- **Ações:** **aprovar/rejeitar empresa**; ver operadores e convites (mesma sub-lista da Gestão de Operadores, em modo leitura pro admin).

### Monitoramento Global

- **Papel:** Admin
- **Objetivo:** visão em tempo real de todos os `Shipment` da plataforma — é a tela que consome o pipeline WebSocket + Redis pub/sub descrito no §5 de ponta a ponta.
- **Dados:** todos os envios, com `status`, carrier, seller, `addressCity`/`addressState`, atualizado ao vivo conforme `TrackingEvent`s são criados em qualquer carrier.
- **Ações:** filtrar por status/carrier/seller; abrir detalhe.
- **Estados:** é o lugar mais natural pra evidenciar visualmente a granularidade dos 9 estados do `ShipmentStatus` (§10) — vale um filtro por estado bem visível, não só uma lista plana.

---

## Gaps conhecidos (não modelados ainda, pra não fingir que estão prontos)

- Upload de documentos no onboarding do seller — citado no fluxo, sem tabela/storage definido.
- Notificação de SLA estourado (usa `DeliveryModality.slaHours`, mas o worker BullMQ ainda não existe — roadmap §7/§5).
- Cancelamento de envio pelo seller — mencionado aqui como ação provável, mas a regra exata (até qual `status`) ainda não está no DESIGN.md, é uma decisão de produto em aberto.
