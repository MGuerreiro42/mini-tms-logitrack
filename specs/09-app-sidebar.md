# Feature Specification: App Sidebar

**Feature**: `app-sidebar` — `apps/web` only: `AppShell` and the shared navigation (`components/common`), the three role layouts, live view counts (`features/shipments`), the live-ops footer (`features/demo`, `features/admin`), recents, keyboard shortcuts and the ⌘K menu
**Created**: 2026-11-11
**Status**: Draft
**Design reference**: `DESIGN.md` §9 (dependency rule, where state lives, live updates, motion); `SCREENS.md` (Global banner, every role's Navigation line); spec `04-live-motion` (one-shot motion, reduced motion), spec `06-tables-and-search` (views and view counts), spec `07-dashboards` FR-027 (pulse), spec `08-demo-showcase` FR-016, FR-026 (demo status, banner slot); `.claude/research/sidebar/ux.md` (§2 IA, §4 responsive, §5 keyboard and screen reader, §7 recommendation), `design.md` (§2 visual system, §3 motion, §4 dark mode), `canvas-notes.md`; approved canvas "Option A" (https://claude.ai/artifact/GHiQr6e5ca7tu4ErZJJ96i), artboards 1, 4, 5, 6 and 7

## Summary

The horizontal nav in the header becomes a 240 px left sidebar grouped by task. Each role's list (seller Shipments, carrier Queue, admin Monitoring) shows its views as nested rows, and the views that mean "act now" carry a live count. Below the nav sit the user's recent shipments and a live-ops footer: connection, Chaos Mode and, for admins, the simulator and webhooks. The sidebar collapses to a 64 px icon rail with `[` and stays that way per browser. Between 1024 and 1279 px it starts as the rail and opens as an overlay. Below 1024 px the bottom tabs remain (at most 4) and More opens a sheet with the whole tree. The header keeps the brand, ⌘K and the user menu, and the Chaos banner stays full width under the header. No API change.

## User Stories *(mandatory)*

### User Story 1 - Navigate from a grouped sidebar (Priority: P1)

A seller at 1440 px sees Overview, Shipments with its views (Active, Late, Exceptions, Delivered, Cancelled), a "Create shipment" button, and a "Setup" section (Modalities, Integrations, Profile). A carrier sees Queue with its views, Performance, and a "Company" section. An admin sees Overview, Monitoring with its views, and a "Tenants" section. The current page is marked.

**Why this priority**: the header nav already holds six seller items and cannot show views. The sidebar is what every later story builds on (ux.md §2, §7).

**Independent test**: as `seller@demo.minitms.dev` at 1440 px, open `/seller/shipments?view=late` from the sidebar. The Late row has `aria-current="page"`. The header has no nav links. A screen reader lists a "Main" navigation landmark. Tab moves through every link and section toggle in DOM order.

**Acceptance scenarios**:

1. **Given** a signed-in user at ≥ 1280 px, **when** any page of their segment renders, **then** the sidebar is docked at 240 px, the header shows the brand, ⌘K and the user menu only, and the Chaos banner spans the full width above both the sidebar and `main`.
2. **Given** `/seller/shipments` with no `view` or `status`, **when** the sidebar renders, **then** the Shipments link carries `aria-current="page"` and no view row does. With `?view=active`, only the Active row does.
3. **Given** `/carrier/queue` with no `view`, **when** the sidebar renders for a manager, **then** the Unclaimed row is current (the page's server-side default), and for an operator the Mine row is.
4. **Given** a detail page such as `/seller/shipments/<id>` or `/admin/shipments/<id>`, **when** the sidebar renders, **then** the owning level-1 item (Shipments, Monitoring) is current, as `NavList` does today.
5. **Given** an expanded section, **when** its header button is activated, **then** it collapses, `aria-expanded` flips, and the state lasts until reload.

---

### User Story 2 - Live counts on the views that need action (Priority: P1)

An operator on any carrier page sees "Mine 4", "Unclaimed 7" and "Exceptions 2" in the sidebar. When the simulator claims a shipment, the numbers change within a few seconds without a reload. When the socket drops, the pills become outlined and the footer reads "Reconnecting · counts may be stale".

**Why this priority**: counts are the product's real-time story in the nav. Option A keeps them visible (ux.md §7).

**Independent test**: as the demo operator, keep `/carrier/performance` open. Claim a shipment from a second window and see Unclaimed drop by one within 3 s. Stop the API and see outlined pills and the reconnecting line. Restart it and see filled pills with fresh numbers.

**Acceptance scenarios**:

1. **Given** the counts endpoint answers, **when** the sidebar renders, **then** counts show only on seller Active, Late and Exceptions; carrier Unclaimed, Mine, To pick up, On the road and Exceptions; and admin Active, Late and Exceptions. No other row has a count.
2. **Given** a count of 0, **when** it renders, **then** no pill shows. **Given** 100 or more, **then** the pill reads "99+" and the link's accessible name still holds the exact number ("Late, 124 shipments").
3. **Given** a burst of `shipment:updated` events, **when** the counts change, **then** the displayed numbers update at most once every 2 s.
4. **Given** the sidebar's subscription is not `live`, **when** it renders, **then** every pill is outlined (no fill, same text colour, still ≥ 4.5:1), and the counts keep polling through the existing fallback.
5. **Given** the open Exceptions count rises, **when** the change is shown, **then** one polite announcement says "Exceptions: 3 open". Further rises within 10 s are rolled into one announcement at the end of that 10 s. No other count is announced.

---

### User Story 3 - Collapse to a rail (Priority: P1)

A carrier manager on a wide queue table presses `[` and the sidebar shrinks to a 64 px rail of icons. A reload keeps the rail. At 1100 px the rail is the default, and the expand button opens the full sidebar over the page without reflowing the table.

**Why this priority**: tables and the map need the width (ux.md pattern 1, 2). Shipping the sidebar without a collapse would narrow every page at 1024–1279.

**Independent test**: at 1440 px press `[` (focus outside a field), reload, and see the rail with no flash of the full sidebar. At 1100 px activate the expand button, press Esc, and see focus back on the button. Tab to a rail icon and read its name in a tooltip.

**Acceptance scenarios**:

1. **Given** ≥ 1280 px, **when** `[` is pressed or the collapse button is activated, **then** the sidebar toggles between 240 px and 64 px, and the choice is stored in the `tms-sidebar` cookie, so the server renders the same state on the next load.
2. **Given** 1024–1279 px, **when** a page loads, **then** the sidebar is the rail whatever the cookie says. Expanding opens the 240 px sidebar as an overlay above `main`. Esc, a click outside or a navigation closes it, and focus returns to the toggle.
3. **Given** the rail, **when** an icon link gets hover or focus, **then** a tooltip shows its name (and its count, if any). The link's accessible name does not depend on the tooltip. View rows and section labels are not in the rail.
4. **Given** the rail and an open Exceptions count above 0, **when** it renders, **then** the owning icon has a danger dot. Its accessible name holds the number ("Shipments, 3 exceptions").
5. **Given** `prefers-reduced-motion`, **when** the sidebar toggles, **then** the width changes with no transition.

---

### User Story 4 - See the live system from any page (Priority: P2)

An admin on Sellers reads the footer: "● Live", "Simulator · running", "Webhooks · 98.4% · n 500" and "Chaos · off". When a scenario starts, the Chaos line turns warning-toned with its label. A seller sees only "Live" and "Chaos". Off the demo deployment, the seller sees only "Live".

**Why this priority**: it shows the real-time architecture on every page (ux.md §1 row 15; design.md §6). It reuses data that already exists, so it is cheap. It is not needed to navigate.

**Independent test**: as the demo admin, start "Storm: failed deliveries" from another tab and see the footer's Chaos line change within 2 s. As the demo seller, find no Simulator or Webhooks line. With `NEXT_PUBLIC_DEMO_LOGIN` off, find no Chaos line.

**Acceptance scenarios**:

1. **Given** any role, **when** the footer renders, **then** the first line reflects the sidebar's own subscription: "Live", "Connecting…" or "Reconnecting · counts may be stale". It uses `LiveIndicator`'s dot and labels.
2. **Given** `useDemoStatus` has data, **when** the footer renders, **then** it shows "Chaos · off" or "Chaos · <label>" in the warning tone. With a `404` or the demo flag off, there is no Chaos line. For admins the line links to `/admin`, where the Demo card is.
3. **Given** an admin, **when** the footer renders, **then** it also shows "Simulator · <running|idle|off>" and "Webhooks · <success rate> · n <n>" from `usePulse`. A `null` part shows "unavailable". The Webhooks line links to `/admin/monitoring`.
4. **Given** the rail, **when** the footer renders, **then** it shows one dot per line with the full text as the accessible name and tooltip.

---

### User Story 5 - Phone navigation (Priority: P2)

A seller at 390 px sees four bottom tabs: Overview, Shipments, Create, More. More opens a bottom sheet with the full tree, the views with their counts, recents and the footer.

**Why this priority**: below 1024 px there is no sidebar, so the views and counts would otherwise be missing on a phone.

**Independent test**: at 390 px tap More, tap "Late 1", and land on `/seller/shipments?view=late` with the sheet closed. Reopen it, press Esc, and see focus back on More.

**Acceptance scenarios**:

1. **Given** < 1024 px, **when** any page renders, **then** there is no sidebar or rail, and the bottom bar shows the role's three tab items plus More. Seller: Overview, Shipments, Create. Carrier: Queue, Metrics, Company. Admin: Overview, Monitoring, Sellers.
2. **Given** the More sheet, **when** it opens, **then** it is a modal dialog titled "Navigation" with the same tree and footer as the sidebar. Targets are ≥ 44 px, and the bottom padding respects `safe-area-inset-bottom`. Any navigation closes it.
3. **Given** the current page is only in the sheet (for example Integrations), **when** the bar renders, **then** More carries the active marker, as today.

---

### User Story 6 - Keyboard and ⌘K (Priority: P2)

A power user presses `g` then `s` to open Shipments, `g` then `o` for Overview, and `[` to collapse. They can turn single-key shortcuts off in the user menu. ⌘K lists the same destinations, including views ("Shipments · Late") and recents, with their shortcut hints.

**Why this priority**: it makes navigation fast, and WCAG 2.1.4 requires an off switch for single-key shortcuts (ux.md §5).

**Independent test**: as the seller, press `g` `s` on the Overview and land on Shipments. Type `g` `s` into the search field and stay put. Turn "Keyboard shortcuts" off in the user menu, reload, press `g` `s` and `[`, and see nothing happen. Open ⌘K, type "late", and open the Late view.

**Acceptance scenarios**:

1. **Given** shortcuts are on and focus is not in a field, **when** `g` and then a key are pressed within 1 s, **then** the matching item opens. Seller: `o` Overview, `s` Shipments, `c` Create shipment. Carrier: `q` Queue, `p` Performance. Admin: `o` Overview, `m` Monitoring. `[` toggles the sidebar (US 3).
2. **Given** a modifier key, an open dialog or the ⌘K menu, or focus in an input, textarea, select or contenteditable, **when** the keys are pressed, **then** nothing happens.
3. **Given** "Keyboard shortcuts" is unchecked in the user menu, **when** any single-key shortcut is pressed, **then** nothing happens. The choice is kept per browser. ⌘K is not affected.
4. **Given** ⌘K, **when** it opens, **then** "Go to" lists every level-1 item and every view row as "<parent> · <view>", each with its shortcut as a `CommandShortcut` hint where one exists. A "Recent" group lists the recents (US 7).

---

### User Story 7 - Get back to a recent shipment (Priority: P3)

A seller who opened three shipments today sees them under "Recent" in the sidebar by tracking code, newest first, and reopens one with a click.

**Why this priority**: this is the useful half of Option C (ux.md §7). It is client-only and comes after the core.

**Independent test**: open two shipment details, return to the Overview, and read both codes under Recent, the last opened first. Sign in as another demo user in the same browser and see their own (empty) list.

**Acceptance scenarios**:

1. **Given** a shipment detail page (seller, carrier or admin) renders its data, **when** it mounts, **then** `{ href, code }` is stored first in the user's recents, without duplicates, capped at 5.
2. **Given** no recents, **when** the sidebar renders, **then** the Recent section is absent. It is not shown as an empty state.
3. **Given** storage is blocked, **when** a detail page is opened, **then** the recents last for the tab session only and nothing throws.

---

### Edge Cases

- A recent shipment that was deleted by the demo reset or cancelled still links. Its detail page shows the existing not-found state. A not-found page does not record a recent, and the list is not pruned.
- Two demo roles in one browser: recents are keyed by `userId`, so a seller never sees an admin `href`.
- The overlay (1024–1279) is open when the window grows past 1280: it closes and the docked state follows the cookie. If the window shrinks below 1024, it closes.
- The peek sheet is open and the overlay is open: Esc closes the overlay first, because it is on top. The peek sheet keeps its own Esc otherwise.
- A Chaos banner is visible: the sidebar is sticky under the header and scrolls with the page until the banner has scrolled away. The footer can sit up to one banner height below the fold at scroll 0. Accepted, because the banner is temporary.
- The counts request fails with a `4xx`: no pills show and polling stops (`fallbackPollInterval`). A `5xx` keeps the last numbers, outlined.
- The list page and the sidebar read the same `viewCounts()` query when the page has no `window`. With `?window=30d` the page tabs count within the window, but the sidebar always counts all time, as "act now" counts do. The sidebar never shows a window.
- An operator sees the Company section, as today. Write access is still decided on each page (`readOnly`).
- `[` on a keyboard layout without a bare `[` key: the collapse button in the sidebar foot does the same.
- JavaScript has not loaded yet: the sidebar is server-rendered, links work, sections are expanded, and counts appear after hydration.

## Functional Requirements *(mandatory)*

### Shell and information architecture

- **FR-001**: `AppShell` MUST take `nav: NavSection[]` in place of `navItems`, where `NavSection = { label?: string; items: NavLink[] }`, `NavLink = { name, shortName?, href, owns?, icon: ReactNode, shortcut?: string, tab?: boolean, primary?: boolean, views?: NavView[], defaultView?: string }` and `NavView = { name, param: 'view' | 'status', value, countKey?: string }`. Icons are passed as rendered elements, so the server layouts can send them to the client sidebar. `NavItem` and `NavList`'s `bar` variant are removed.
- **FR-002**: The three layouts MUST declare these trees using existing routes only. Icons are Lucide at 16 px, stroke 1.75, on level 1 only.

  | Role | Unlabelled section | Labelled sections |
  |---|---|---|
  | Seller | "Create shipment" (`primary`, `/seller/shipments/new`, `c`, tab "Create"); Overview (`LayoutDashboard`, `o`, tab); Shipments (`Package`, `s`, tab) with Active · Late · Exceptions (`view`, counted) · Delivered · Cancelled (`status`) | Setup: Modalities (`SlidersHorizontal`), Integrations (`Plug`), Profile (`UserRound`) |
  | Carrier (both roles) | Queue (`Inbox`, `q`, tab, `defaultView` per role as in `queue/page.tsx`) with Unclaimed · Mine · To pick up · On the road · Exceptions (counted) · Done; Performance (`Gauge`, `p`, tab "Metrics") | Company: Company (`Building2`, tab), Modalities & coverage (`MapPinned`) |
  | Admin | Overview (`LayoutDashboard`, `o`, tab); Monitoring (`Radar`, `m`, tab, owns `/admin/shipments`, `defaultView` `active`) with Active · Late · Exceptions (counted) | Tenants: Sellers (`Store`, tab), Carriers (`Truck`) |

- **FR-003**: At ≥ 1024 px, `AppShell` MUST lay out the header (64 px, unchanged except that the nav is removed), then the banner slot (full width), then a two-column grid: sidebar and `main`. The sidebar is `bg-nav` with a right edge of `1px 0 0 var(--nav-line)`, is sticky under the header, fills the rest of the viewport height, and scrolls on its own. `main` keeps its padding and is unchanged below 1024 px.
- **FR-004**: The `primary` item MUST render at the top of the sidebar as an outline `Button` link (the page keeps its one filled primary). Rows are 32 px (36 px on `pointer: coarse`), Geist 13 px/500, and nested view rows are indented 28 px with no icon. States follow design.md §2: rest `muted-foreground`, hover `bg-accent`, current `bg-selected` and 600 weight with a `primary` icon (plus `inset 0 0 0 1px var(--border)` in dark mode), and focus with the global ring inset 1 px. There is no left bar, because the 3 px bar means "caution row".
- **FR-005**: The current item MUST be computed by one function (moved from `useActiveHref`). First, find the level-1 item by longest matching root (`href` and `owns`). Then, on that item's own `href` path, take the view row whose `param` value equals the URL's, or `defaultView` when the URL has neither `view` nor `status`. The view row gets `aria-current="page"` and its parent gets the parent-of-current style only. When no view row matches, the level-1 item gets `aria-current="page"`. Reading the URL uses `useSearchParams` inside a `Suspense` boundary, which renders the same tree without the view match.
- **FR-006**: A labelled section MUST render its label as a disclosure button (`aria-expanded`, `aria-controls`, 11 px/600 sentence case) above a list. An item with `views` MUST render a disclosure button beside its link, labelled "Show <name> views" or "Hide <name> views", that toggles the nested list. All are expanded by default and kept in React state for the layout's lifetime. The section of the current item is never collapsed on navigation. There is no `tree` role and no roving tabindex (ux.md §5).
- **FR-007**: The sidebar MUST be `<nav aria-label="Main">` holding `ul`/`li` lists, and `AppShell` MUST add visually hidden, focus-revealed skip links "Skip to content" (to `main`, all widths) and "Skip to navigation" (≥ 1024 px); none exists today. Row targets are ≥ 24 px.

### Collapse, rail and overlay

- **FR-008**: The rail MUST be 64 px and show only the `primary` item (icon-only outline button) and level-1 icon links. Each link has its name in a visually hidden span and a `Tooltip` (new `components/ui/tooltip.tsx` from shadcn, on the installed `radix-ui`) that opens on hover after 300 ms and immediately on focus. View rows, section labels and Recent are hidden in the rail.
- **FR-009**: At ≥ 1280 px the docked state MUST come from the `tms-sidebar` cookie (`rail` or absent). `AppShell` reads it with `cookies()`, so the first paint is right. A collapse button at the sidebar foot (`PanelLeftClose` / `PanelLeftOpen`, `aria-expanded`, `aria-keyshortcuts="["`) toggles the state and writes the cookie (`path=/`, one year, `SameSite=Lax`).
- **FR-010**: At 1024–1279 px the sidebar MUST render as the rail regardless of the cookie (CSS only, no flash). The same button opens the 240 px sidebar as a non-modal overlay (`position: fixed` under the header, `shadow-panel`), with no reflow of `main`. It closes on Esc, on a pointer down outside it, on any navigation and when the viewport leaves the range, and focus returns to the button. The cookie is not written in this range.
- **FR-011**: The width change MUST animate `grid-template-columns` over `--duration-base` with `--ease-standard`. Labels fade out over 100 ms before the width settles. The overlay enters with a 6 px `translateX` and opacity over 150 ms (`--ease-enter`). The global reduced-motion rule removes all of it.

### Live counts

- **FR-012**: Shared `components/common/nav-counts.tsx` MUST define `NavCountsContext` `{ counts?: Partial<Record<string, number>>; status: LiveStatus }` and `useNavCounts()`. The default is `{ status: 'connecting' }`, which renders no pills. The sidebar reads it, and a feature provides it, following the §9 dependency rule.
- **FR-013**: `features/shipments/components/nav-counts-provider.tsx` MUST export `SellerNavCounts`, `CarrierNavCounts` and `AdminNavCounts`. Each layout wraps its `AppShell` in the matching one. Each provider:
  - reads the existing query: `useSellerViewCounts()` (no window), `useQueueViewCounts()`, or `useAdminShipmentViewCounts({}, status)`;
  - holds its own `useSocketSubscription` to `subscribe:seller`, `subscribe:queue` or `subscribe:monitoring` (ref-counted rooms are shared with the page). On `shipment:updated` it invalidates only that counts query, throttled with `throttle(…, 2000)`, and never calls `invalidateShipmentQueries`;
  - passes the counts through a 2 s value throttle, so a page's own 300 ms invalidation of the same key cannot repaint the sidebar more often (US 2 scenario 3);
  - falls back to polling through `fallbackPollInterval(status)` for the seller and queue queries. The admin query already does this.
- **FR-014**: A `NavView` with `countKey` MUST render a right-aligned 20 px pill, `tabular-nums` 12 px. It is hidden at 0 and capped at "99+" visually. Seller and admin "exceptions" and carrier "exceptions" use the exception tone (`bg-destructive-tint text-destructive` and the filled-disc risk glyph). Late uses the same tone. The other counts are plain `muted-foreground` numbers with no fill. While `status !== 'live'`, filled pills become outlined (`border-current`, transparent fill). A changed number re-renders with `animate-value-in` (once, no loop).
- **FR-015**: A counted link's accessible name MUST be "<name>, <n> shipment(s)" via `lib/plural.ts`, or just "<name>" at 0. The pill itself is `aria-hidden`.
- **FR-016**: The sidebar MUST hold one visually hidden `role="status"` region. It announces only increases of the `exceptions` count after the first value: "Exceptions: <n> open". After an announcement, further changes within 10 s are announced once, with the latest value, when the 10 s end. A decrease is not announced. The region lives in the sidebar or, below 1024 px, in the bottom bar, so exactly one is mounted.

### Live-ops footer

- **FR-017**: `AppShell` MUST take an optional `sidebarFooter` slot rendered under the nav, above the collapse button, and in the More sheet. The shell always renders the connection line first from `useNavCounts().status`, reusing `LiveIndicator`'s labels and dot. While not live, the line reads "Reconnecting · counts may be stale". It also exports a `SidebarStatusRow` (`{ tone, label, href? }`) that collapses to a dot with a tooltip in the rail.
- **FR-018**: `features/demo/components/chaos-status-row.tsx` MUST render "Chaos · off" or "Chaos · <label>" (`warning` dot) from `useDemoStatus()`, and nothing on `404`, with no data, or when `DEMO_LOGIN_ENABLED` is false. It takes an optional `href`. The seller and carrier layouts pass `<ChaosStatusRow />`.
- **FR-019**: `features/admin/components/admin-ops-status.tsx` MUST render "Simulator · <state>" and "Webhooks · <rate>% · n <n>" (one decimal, as `PulseStrip` formats it; a `null` part reads "unavailable") from `usePulse()`, followed by `<ChaosStatusRow href="/admin" />`. The admin layout passes it. The webhooks line links to `/admin/monitoring`. No new request: the pulse key is shared with the admin Overview.

### Phone

- **FR-020**: Below 1024 px the bottom bar MUST show the `tab: true` items (at most 3) and a More button, keeping today's markers, sizes and `--toast-bottom` handling. More opens a bottom-anchored `Dialog` titled "Navigation" that renders the same sidebar tree (views, counts, Recent) and footer at 44 px targets with `pb-[max(--spacing(4),env(safe-area-inset-bottom))]`. It closes on any navigation. More is marked active when the current item has no tab. The `DropdownMenu` More is removed.

### Keyboard and ⌘K

- **FR-021**: `components/common/use-nav-shortcuts.ts` MUST listen on `window` for `g` followed within 1 s by a `NavLink.shortcut`, and for `[`. It ignores events with a modifier, `defaultPrevented`, `isTyping(target)`, or an open `[role="dialog"]` (as `CommandMenu` does). Each link with a shortcut carries `aria-keyshortcuts="G <KEY>"`.
- **FR-022**: Shared `hooks/use-shortcuts-enabled.ts` MUST store the on/off choice in `localStorage` (`tms:shortcuts`), following the `use-density.ts` pattern (try/catch, session fallback, default on). `UserMenu` gains a `DropdownMenuCheckboxItem` "Keyboard shortcuts". Off disables `g`-sequences and `[`, but not ⌘K.
- **FR-023**: `CommandMenu` MUST take the `NavSection[]` and list, under "Go to", every level-1 item and every view as "<parent> · <view>" (value searchable by both words), with `CommandShortcut` "G S" where set. A "Recent" group lists the recents by code.

### Recents

- **FR-024**: Shared `hooks/use-recents.ts` MUST keep up to 5 `{ href, code }` in `localStorage` under `tms:recents:<userId>` (the session's `userId`), newest first and deduplicated by `href`. It uses `useSyncExternalStore` with the density hook's try/catch pattern, and exposes `useRecents()` and `rememberRecent(entry)`.
- **FR-025**: `ShipmentDetailCard`, `CarrierShipmentDetail` and `AdminShipmentDetail` MUST call `rememberRecent` once their shipment has loaded (not on error or not-found). The sidebar MUST render "Recent" (`History` icon on the label, codes in mono, `/` + the page's own route) under the nav when the list is not empty.

### Pages that lose width

- **FR-026**: At 1024 px with the rail, `main` keeps 880 px of content, against 944 px today. At 1280 px docked it keeps 960 px, and at 1440 px 1120 px. Before wrap-up, the seller Overview (four tiles, `PipelineBar` at five columns, the 7/5 columns), the admin Overview, Monitoring, the carrier Queue, Carrier Performance and Carrier 360 MUST be screenshotted at 1024 (rail), 1100 (overlay open), 1280 and 1440 px, in light and dark mode. Any grid that wraps or truncates badly moves its viewport breakpoint to a `main` container query (`@container/main` on `main`, `@4xl/main:` in place of `lg:`) in that component only. Tables keep their own horizontal scroll.

### Docs

- **FR-027**: On completion, `SCREENS.md` MUST gain an "App shell" section (sidebar, rail, overlay, phone sheet, counts, footer, shortcuts, recents) and update each role's Navigation lines, and `DESIGN.md` §9 MUST record the counts context and its providers, the `sidebarFooter` slot, the cookie, and the `tms:shortcuts` and `tms:recents:*` storage keys. `README.md` links this spec.

### Key Entities

- No server entity, model or migration.
- **`NavSection` / `NavLink` / `NavView`** (web types, FR-001): the per-role navigation tree, declared in each layout.
- **Browser state**: cookie `tms-sidebar` (rail or not, ≥ 1280 px); `localStorage` `tms:shortcuts` (on/off) and `tms:recents:<userId>` (≤ 5 `{ href, code }`). None of it leaves the browser.

## Success Criteria *(mandatory)*

- **SC-001**: At 1440 px, every page of every role reaches any level-1 item or view in one click from the sidebar. The header holds no nav link.
- **SC-002**: A claim or status change made in another window changes the matching sidebar count within 3 s, and a burst of events never repaints the counts more than once per 2 s (unit test with fake timers).
- **SC-003**: The rail state survives a reload with no visible flash (server-rendered from the cookie) at 1440 px.
- **SC-004**: axe reports no violation on the seller Overview with the sidebar expanded, as the rail, with the overlay open, and with the More sheet open at 390 px. The nav landmark, `aria-current`, `aria-expanded` and the count-bearing link names are asserted in component tests.
- **SC-005**: With shortcuts off, no single-key press changes the page or the sidebar (test).
- **SC-006**: No page listed in FR-026 has overlapping or clipped content at 1024, 1100, 1280 or 1440 px in either theme.
- **SC-007**: No pull request of the delivery plan exceeds about 500 changed lines including tests.

## Architecture Mapping *(mandatory)*

- **API (`apps/api`)**: unchanged. Reused: `GET /shipments/view-counts`, `GET /shipments/queue/view-counts`, `GET /admin/shipments/view-counts`, `GET /demo/status`, `GET /admin/pulse`; the rooms `seller`, `queue` and `monitoring` and the event `shipment:updated`.
- **Web (`apps/web`)**:
  - `src/components/common/`: `app-shell.tsx` (grid, cookie, slots), `sidebar.tsx` (new: tree, sections, views, rail, overlay, footer area, live region), `nav-tree.ts` (new: types and the current-item function, moved from `nav-list.tsx`), `nav-list.tsx` (tabs only, More sheet), `nav-counts.tsx` (new context), `sidebar-status-row.tsx` (new), `use-nav-shortcuts.ts` (new), `command-menu.tsx` (sections, views, recents), `user-menu.tsx` (shortcuts toggle).
  - `src/components/ui/tooltip.tsx` (new, shadcn).
  - `src/hooks/`: `use-shortcuts-enabled.ts`, `use-recents.ts` (new).
  - `features/shipments/components/nav-counts-provider.tsx` (new); `shipment-detail-card.tsx`, `carrier-shipment-detail.tsx`, `admin-shipment-detail.tsx` (`rememberRecent`).
  - `features/demo/components/chaos-status-row.tsx` (new); `features/admin/components/admin-ops-status.tsx` (new).
  - `app/{seller,carrier,admin}/layout.tsx`: the trees of FR-002, the counts provider and the footer slot.
  - Components named in FR-026 only if a check fails.
- **Prisma models touched**: none.
- **Real-time**: no new event or room. The sidebar holds one more ref-counted subscription per role room. It invalidates only its counts query.
- **New dependencies**: none. The tooltip uses the installed `radix-ui`.
- **Configuration**: none.

## Delivery Plan

Stacked pull requests, merged in order. Each one passes the verification in the Notes below on its own and leaves every screen working. Sizes are changed lines including tests, estimated against `docs/spec-08-wrapup`.

| # | Branch | Content | FRs | Apps | Size | Depends on |
|---|---|---|---|---|---|---|
| 1 | `feat/sidebar-shell` | nav tree types and current-item function, `Sidebar` docked at 240 px with sections, views and disclosures, header nav removed at ≥ 1024, skip link, three layouts on the new trees, tabs read `tab` items | FR-001–FR-007 | web | ~480 | — |
| 2 | `feat/sidebar-rail` | tooltip, rail, collapse button, `tms-sidebar` cookie, 1024–1279 rail and overlay (Esc, outside, navigation, resize, focus return), motion | FR-008–FR-011 | web | ~420 | 1 |
| 3 | `feat/sidebar-counts` | `NavCountsContext`, three providers with their own throttled subscription, pills (0, 99+, tones, outlined), link names, Exceptions live region; fake-timer tests | FR-012–FR-016 | web | ~450 | 1 |
| 4 | `feat/sidebar-ops-footer` | `sidebarFooter` slot, connection line, `SidebarStatusRow` (rail dots), `ChaosStatusRow`, `AdminOpsStatus` | FR-017–FR-019 | web | ~300 | 2, 3 |
| 5 | `feat/nav-more-sheet` | three tabs + More, bottom `Dialog` with the tree, counts and footer, `DropdownMenu` More removed | FR-020 | web | ~300 | 4 |
| 6 | `feat/nav-shortcuts` | `g`-sequences and `[`, `aria-keyshortcuts`, shortcuts toggle in `UserMenu`, ⌘K sections and views with hints | FR-021–FR-023 | web | ~380 | 2 |
| 7 | `feat/sidebar-recents` | `useRecents`, the three detail pages record, Recent section, ⌘K Recent group | FR-024, FR-025 | web | ~280 | 1, 6 |
| 8 | `fix/sidebar-page-widths` | FR-026 screenshots; container queries where a page breaks | FR-026 | web | ~150 | 1–7 |
| 9 | `docs/spec-09-wrapup` | `SCREENS.md`, `DESIGN.md` §9, `README.md`, Status and Changelog | FR-027 | docs | ~80 | 1–8 |

PRs 2, 3 and 6 can be reviewed in parallel once 1 is merged. 7 stacks on 6 only for the shared `command-menu.tsx`. If PR 1 exceeds the budget, the disclosure buttons (FR-006) move into a PR of their own before 2.

## Out of Scope

- Pins, favourites, reordering and hiding items (Option C "Customize"). Decision: Defer until saved views exist. There is nothing user-made to pin yet, and server-side per-user state would need an API.
- Saved views in the sidebar. They do not exist (spec 06 has fixed views only).
- An "At risk" view and its count. Decision: Defer. The API has no `at_risk` view. The due-soon rule (`lib/sla.ts`, max(25% of the SLA window, 6 h)) is computed per row on the web, and a view needs it in SQL. Open question below.
- A notifications bell, unread dots and a notifications backend. There is no bell in the header today, and none is added.
- The admin tenant switcher / "viewing as". Decision: Defer. It needs impersonation or a tenant-scoped admin read, which no route offers.
- Nav items for pages that do not exist (Team, Invites, Scorecard, Reports, API keys and Deliveries as separate pages, a Map page, an Exceptions page).
- A resizable sidebar (200–320 px), pinning the overlay as docked at 1024–1279, and hover peek on the left edge.
- Rail flyouts for sub-pages. The rail shows tooltips only, and the views stay reachable through expand, ⌘K and the page's tabs.
- A `?` shortcut cheat sheet. Hints show in ⌘K and on the links' `aria-keyshortcuts`.
- Webhook health in the seller footer. There is no seller-scoped summary endpoint, and the pulse is admin-only.
- Simulator state for sellers and carriers (pulse is admin-only).
- Inline sparklines, "New" pills, keyboard hint chips on hover, and a double-click collapse handle (design.md §6).
- Persisting the collapsed sections across reloads.
- Changing operator access to the Company pages.

## Assumptions and Dependencies

- Built on `docs/spec-08-wrapup`: view counts (spec 06), pulse (spec 07), demo status, banner slot and warning tokens (spec 08) exist.
- The shell is already dynamic per request (session cookie), so reading `tms-sidebar` with `cookies()` adds no rendering cost.
- Holding one more ref-counted room subscription per signed-in tab is cheap: the socket is already retained on every page by `useDemoStatus` on the demo deployment, and rooms are shared with the page.
- All-time "act now" counts (no window) are what the sidebar means. A page's window applies to its own tabs only.
- The 99+ cap, 2 s throttle and 10 s announcement roll-up come from ux.md §2 and §5. They are not configurable.

### Open questions

- Should "At risk" (due soon) become an API view with a count, in a later spec? That needs the due-soon rule in SQL.
- Should operators lose the Company section (ux.md §2 IA) or keep today's access? This spec keeps today's.
- Is "Late" in the exception tone too loud next to Exceptions, which already includes late shipments? The canvas shows both red, and this spec follows it.

## Notes for the AI Agent

- Before coding: if the change involves an architecture decision not covered in the Architecture Mapping above, enter plan mode and validate with the user first.
- Implement only what's listed in the Functional Requirements above, one PR of the Delivery Plan at a time, each on its own branch stacked on its dependencies. Stop and re-split a PR that grows past about 500 changed lines.
- Respect the §9 dependency rule: `components/common` and `hooks/` never import a feature. The counts and footer reach the shell only through the context (FR-012) and the `sidebarFooter` slot (FR-017), composed in `app/*/layout.tsx`. No Biome `noRestrictedImports` change is needed.
- Reuse what exists: `throttle`, `isTyping`, `useMediaQuery`, `fallbackPollInterval`, `LiveIndicator` labels, `plural`, the `use-density.ts` storage pattern, `CommandShortcut`, `Dialog`, `Button`. Don't add a store or a dependency.
- Tests: current-item function (longest root, view param, `defaultView`, detail pages); pill rules (0, 99, 100, outlined); provider throttle and invalidation scope (fake timers, no `shipmentKeys.all` invalidation); live-region roll-up; shortcuts ignored in fields, in dialogs and when off; recents dedupe, cap and per-user key; More sheet closes on navigation.
- Mandatory verification before reporting done: `pnpm lint:ci`, `pnpm test`, `pnpm build` in `apps/web`. Screenshot the seller, carrier and admin shells at 1440, 1280, 1100 and 390 px in light and dark mode, and run axe (SC-004). Don't use ports 3100, 3433, 55433 or 56380, which are reserved for the preview environment.
- On completion: update `Status` at the top of this file and fill in the Changelog below.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-11 | Spec created from `.claude/research/sidebar/` (ux.md, design.md, canvas-notes.md) and the approved canvas, Option A, plus its live-ops footer and recents. Every route, view, count, hook and endpoint was verified against `docs/spec-08-wrapup` |
