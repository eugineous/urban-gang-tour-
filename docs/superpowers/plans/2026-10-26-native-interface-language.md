# Native Interface Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver immediate, persistent six-language customer-interface switching with English first, without translating private data or changing commerce behavior.

**Architecture:** A client preference store/provider sits above the pathname-keyed shell; server HTML and shared caches remain English. Typed, feature-owned catalogues carry all six variants for their loaded feature. Server pages retain data/auth logic and render localized client leaves for factory controls, with explicit original-language content boundaries.

**Tech Stack:** Existing Next.js 16.4.2 App Router, React, TypeScript, Intl, Node Vitest and the approved local Playwright/Miniflare tooling. No translation API, new dependency or paid service.

**Spec:** `docs/superpowers/specs/2026-10-26-english-first-automation-design.md`, Delivery A; approved by the owner on 26 October 2026.

## Global Constraints

- Supported native locale IDs: `en`, `sw`, `fr`, `zh-Hans`, `ru`, `es`.
- Resolve an explicit valid saved choice, otherwise English. Browser language, country and automatic detection must never override this rule.
- Use a versioned local preference, `ugt-interface-language-v1`, and one-time `ugt-interface-language-migrated-v1` marker. Preserve the old preference.
- Server HTML and the initial hydration snapshot stay English.
- No DOM text replacement or third-party translation script is introduced.
- Keep the chooser in existing footer/menu or local form utility locations, not the main header.
- Changing language must not remount forms, reset cart/checkout state, lose focus or rerun payment effects.
- Business names, people, article text, CMS copy, campaign content, customer inputs, references, amounts and legal bodies are data, not translation keys.
- Prices still identify KES and use the same underlying numeric amount. Venue dates and time-zones remain authoritative.
- Preserve stable real links, canonical URLs, publication approvals, consent values, roles and security checks.
- Private staff dashboards, server email/PDF templates and minimal outage pages remain English; external provider screens remain provider-controlled.
- The retired p1–p14 products stay retired; Color Blast remains preview-only.
- No live receipt/STK/charge/refund/message is sent as a test.

## Review Focus

1. A retained legacy French preference must not resurrect after migration, reset/removal and reload, including partially writable storage. Task 2 owns these tests.
2. Switching while an error is visible, a form is filled, a quote exists or payment polling is active must update labels without resetting state or creating writes. Tasks 6–8 own these tests.
3. Saved preferences, standalone documents and staff routes must not cause SSR hydration/cache contamination or incorrect language declarations. Tasks 3, 7 and 8 own these tests.
4. Date-only event days, DST boundaries, numeric references and fractional KES amounts must not be shifted, grouped as identifiers or converted into another currency. Tasks 1, 5 and 6 own these tests.
5. Long French/Russian text, Chinese labels and keyboard focus must remain usable at 360/390/768/1440px; missing catalogue keys must not silently hide incomplete coverage. Tasks 1, 3 and 8 own these tests.

---

## Execution boundaries and file responsibilities

Start from `1760812` plus this plan commit, preserving main's `89f8d84` merchandise release. This branch contains design documents only. Before product changes, update AGENTS.md with the approved language/maintenance scope and preserve its existing financial, content and release constraints.

Execute Tasks 1–8 sequentially with one writer in this worktree. Reviewers may inspect read-only. Tasks 4–7 share existing large components, so do not run parallel writers against them. Record commits, exact verification commands and artifacts in `docs/agent-work/english-first/CHECKPOINT.md` at task boundaries. Do not create a second localization architecture.

New pure modules:

- `lib/i18n/locale.ts`: finite locale registry and native/legacy normalization.
- `lib/i18n/messages.ts`: catalogue types, selection, interpolation and integrity checks.
- `lib/i18n/format.ts`: presentation-only numbers, KES, date-only days and Nairobi times.
- `lib/client/interface-language.ts`: injectable browser preference store, migration and events.
- `ui/i18n/LanguageProvider.tsx`: provider, context and `useInterfaceLanguage`/`useMessages` hooks.
- `ui/i18n/MessageText.tsx`: safe rich-text client leaf for server/client parents.
- `ui/i18n/OriginalContent.tsx`: explicit source-language block and translated disclosure.
- `ui/i18n/catalogues/{shell,privacy,marketing,discovery,media,commerce,forms,account,documents,help,organizer-auth}.ts`: feature-owned, complete six-language catalogues.
- `docs/i18n/surfaces.json`, `scripts/interface-language-coverage.mjs`: audited surface-to-catalogue/test mapping and static regression checks, not a DOM translator.

Canonical contracts produced by Tasks 1–2:

```ts
export const INTERFACE_LOCALES = ['en','sw','fr','zh-Hans','ru','es'] as const;
export type InterfaceLocale = typeof INTERFACE_LOCALES[number];
export type Message = string | Readonly<Partial<Record<Intl.LDMLPluralRule,string>> & {other:string}>;
export type Catalogue<K extends string> = Readonly<Record<InterfaceLocale,Readonly<Record<K,Message>>>>;
export type MessageValues = Readonly<Record<string,string|number>>;
export type FormattedMessage = {text:string;lang:InterfaceLocale;fallback:boolean};
export function nativeLocale(value:unknown):InterfaceLocale|undefined;
export function legacyNativeLocale(value:unknown):InterfaceLocale|undefined;
export function isEnglishOnlyInterfacePath(path:string|null):boolean;
export function defineCatalogue<const E extends Record<string,Message>>(
  value:{en:E}&Record<Exclude<InterfaceLocale,'en'>,Readonly<Record<keyof E,Message>>>
):Catalogue<Extract<keyof E,string>>;
export function selectMessageTemplate<K extends string>(
  catalogue:Catalogue<K>,locale:InterfaceLocale,key:K,count?:number
):{template:string;lang:InterfaceLocale;fallback:boolean};
export function formatMessage<K extends string>(
  catalogue:Catalogue<K>,locale:InterfaceLocale,key:K,values?:MessageValues
):FormattedMessage;
export function catalogueProblems(catalogue:Catalogue<string>):string[];
export function formatInterfaceNumber(value:number,locale:InterfaceLocale,region?:string):string|null;
export function formatKes(value:number,locale:InterfaceLocale,region?:string):string|null;
export function formatCalendarDay(day:string,locale:InterfaceLocale,style?:'short'|'long'):string|null;
export function formatNairobiTime(instant:string,locale:InterfaceLocale):string|null;
```

`formatMessage` uses a numeric `values.count` for plural selection and formats numeric placeholders; references must be passed as strings. `MessageText` accepts React-node placeholders and renders tokens as React nodes, never HTML strings. It uses the same template selection and wraps an English fallback in the correct language span. String-only attributes/options/SVG titles use `useMessages`, not HTML spans.

```ts
export type LanguageSnapshot = Readonly<{
  locale:InterfaceLocale;persistence:'unchecked'|'available'|'unavailable'
}>;
export type StorageLike = Pick<Storage,'getItem'|'setItem'>;
export interface LanguagePreferenceStore {
  getSnapshot():LanguageSnapshot;
  getServerSnapshot():LanguageSnapshot;
  subscribe(listener:()=>void):()=>void;
  start():void;
  stop():void;
  setLocale(locale:InterfaceLocale):void;
  reset():void;
}
export function createLanguagePreferenceStore(options:{
  storage:()=>StorageLike|null;events:EventTarget
}):LanguagePreferenceStore;
```

The provider hook returns `{locale,preferredLocale,persistence,setLocale,reset}`. `locale` is effective English on excluded staff screens while `preferredLocale` remains saved. Provide a safe English context default for standalone SSR component tests; actual chooser behavior must be tested beneath the real provider.

## Task 1: Typed messages, locale rules and presentation-only formatting

**Files:** Create `lib/i18n/{locale,messages,format}.ts`; create `__tests__/interface-language-messages.test.ts` and `__tests__/interface-language-format.test.ts`.

**Interfaces:** Produces the pure contracts above. Consumes existing publication/event date parsers where valid; do not change their wire values or lifecycle calculations.

- [ ] **Write failing tests for exact locales, key/placeholder parity, escaping, plural branches and date/money invariants.** Include these concrete assertions:

```ts
expect(nativeLocale('auto')).toBeUndefined();
expect(nativeLocale({locale:'fr'})).toBeUndefined();
expect(legacyNativeLocale('zh-CN')).toBe('zh-Hans');
expect(formatKes(1234.5,'en')).toBe('KES 1,234.5');
expect(formatKes(1234.5,'fr')).toContain('KES');
expect(formatMessage(messages,'fr','reference',{code:'001234'}).text).toContain('001234');
expect(catalogueProblems(messages)).toEqual([]);
```

Use this complete fixture. Exercise counts 0,1,2,5,21,1.5; remove a key and alter a placeholder in cloned fixtures and require integrity errors. Render a malicious interpolation string through React and require escaped text, not an image/script element.

```ts
const messages=defineCatalogue({
 en:{reference:'Reference {code}',items:{one:'{count} item',other:'{count} items'}},
 sw:{reference:'Rejeleo {code}',items:{one:'Kipengee {count}',other:'Vipengee {count}'}},
 fr:{reference:'Référence {code}',items:{one:'{count} article',other:'{count} articles'}},
 'zh-Hans':{reference:'参考编号 {code}',items:{other:'{count} 件商品'}},
 ru:{reference:'Номер {code}',items:{one:'{count} товар',few:'{count} товара',many:'{count} товаров',other:'{count} товара'}},
 es:{reference:'Referencia {code}',items:{one:'{count} artículo',other:'{count} artículos'}}
});
expect(formatMessage(messages,'ru','items',{count:2}).text).toBe('2 товара');
expect(formatCalendarDay('2026-02-30','en')).toBeNull();
expect(formatKes(Number.NaN,'en')).toBeNull();
vi.stubEnv('TZ','America/Los_Angeles');
const venueDay=formatCalendarDay('2026-10-26','en');
vi.stubEnv('TZ','Pacific/Auckland');
expect(formatCalendarDay('2026-10-26','en')).toBe(venueDay);
vi.unstubAllEnvs();
```

- [ ] **Run RED:** `npx vitest run --no-cache __tests__/interface-language-messages.test.ts __tests__/interface-language-format.test.ts`; require failure from missing modules/contracts, not setup errors.
- [ ] **Implement the finite registry and formatter functions.** No browser globals in these modules. Keep KES explicit and preserve fractional amounts; never format numeric-looking string IDs. Use verified ISO day parsing, construct a neutral noon instant for date-only formatting, and explicitly use `Africa/Nairobi` for event times. Return null for invalid dates/numbers; callers render their localized unavailable message, never `Invalid Date`/`NaN` or a fabricated zero amount.

```ts
const parts = new Intl.NumberFormat(formatLocale(locale,region), {
  maximumFractionDigits:2
}).format(value);
return 'KES '+parts;
```

`formatLocale` is an internal Task 1 helper: combine the supported interface language with a bounded valid browser region hint if Intl supports it; otherwise use the language's existing locale mapping. Browser settings never select `InterfaceLocale`. Validate dates before formatting; do not parse a date-only value through the visitor's time-zone.

- [ ] **Implement catalogue integrity and safe tokens.** Compare English key sets and placeholder names with each locale/plural branch. Use `Intl.PluralRules`, falling back to `other`. Missing keys fall back to English; never return a raw key. No `eval`, `innerHTML` or arbitrary-data string lookup.
- [ ] **Run GREEN and typecheck:** focused tests and `npx tsc --noEmit`. Add timezone tests for America/Los_Angeles and Pacific/Auckland, showing the same venue day; no application time-zone mutation.
- [ ] **Commit:** `git add lib/i18n __tests__/interface-language-messages.test.ts __tests__/interface-language-format.test.ts && git commit -m "Add typed native locale messages and formatting"`.

## Task 2: Preference store, one-time migration and React subscription

**Files:** Create `lib/client/interface-language.ts`, `ui/i18n/LanguageProvider.tsx`, `ui/i18n/MessageText.tsx`, `ui/i18n/OriginalContent.tsx`, `__tests__/interface-language-preference.test.ts`, `__tests__/interface-language-rendering.test.ts`.

**Interfaces:** Consumes Task 1. Produces the store/provider/hooks above; `useMessages<K>(catalogue:Catalogue<K>)` returns `(key:K,values?:MessageValues)=>string`. `MessageText` takes `{catalogue,message,values?:Readonly<Record<string,ReactNode>>}`. `OriginalContent` takes `{children,language?:string,disclose?:boolean,inline?:boolean}` and preserves children exactly; defaults are language=en-KE, disclose=false, inline=false. Inline renders a span, otherwise a div. Article/legal callers request one disclosure, not a repeated notice on every inline value. The native disclosure has its own language declaration, not the original block's language.

- [ ] **Write failing store tests using an in-memory StorageLike and EventTarget.** The server snapshot must be one stable English object. Include this lifecycle, with subscriptions checked after each transition:

```ts
const values=new Map<string,string>();
const memory={getItem:(key:string)=>values.get(key)??null,
 setItem:(key:string,value:string)=>{values.set(key,value);},
 removeItem:(key:string)=>{values.delete(key);}};
const events=new EventTarget();
memory.setItem('ugt-language-choice','fr');
const store=createLanguagePreferenceStore({storage:()=>memory,events});
store.start();
expect(store.getSnapshot().locale).toBe('fr');
memory.removeItem('ugt-interface-language-v1');
events.dispatchEvent(Object.assign(new Event('storage'),{key:'ugt-interface-language-v1'}));
expect(store.getSnapshot().locale).toBe('en');
store.setLocale('ru');
expect(store.getServerSnapshot().locale).toBe('en');
store.reset();
store.stop();
const next=createLanguagePreferenceStore({storage:()=>memory,events});
next.start();
expect(next.getSnapshot().locale).toBe('en');
```

The fixture implements removeItem for test setup even though the store only needs getItem/setItem. Cover marker-only write success, marker failure, preference write failure, throwing storage getters, invalid values, null clear events, duplicate start/stop and native English reset.

- [ ] **Run RED:** `npx vitest run --no-cache __tests__/interface-language-preference.test.ts __tests__/interface-language-rendering.test.ts`.
- [ ] **Implement stable observable snapshots.** Initialize without reading browser globals; `start` performs guarded migration and subscriptions. Persist the marker before legacy import, never erase the legacy key, and never reimport it after migration. `setLocale` notifies memory subscribers immediately before guarded persistence; failures set `persistence:'unavailable'`. `reset` selects/persists explicit English. Clean up events on stop.
- [ ] **Implement the provider above route-keyed children.** Create one store per provider using a stable useState initializer; never put visitor preferences into a server module-global store. Use `useSyncExternalStore` with a stable immutable English server snapshot. Derive effective English for private `/admin`, `/organizer/dashboard`, `/organizer/events` screens without changing the saved preference. Update document language only after hydration. Browser languagechange may refresh formatting hints but cannot choose a language.

```tsx
const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
const locale=isEnglishOnlyInterfacePath(path)?'en':snapshot.locale;
useEffect(()=>{document.documentElement.lang=locale==='en'?'en-KE':locale;},[locale]);
```

Define `isEnglishOnlyInterfacePath` in Task 1's locale module with segment boundaries. Test admin/private organizer paths true, public organizer login/signup false. Make rich token interpolation React-node-based and mark fallback/original blocks with their actual language. Do not key children by locale or clone/translate arbitrary children.
- [ ] **Run GREEN and hook-rendering tests.** Keep existing form subtree identities stable; test subscription cleanup and original input/reference text preservation. Do not add a DOM-testing dependency; use current Node fixtures and reserve effect/hydration assertions for Task 8's browser.
- [ ] **Commit the exact new files** with message `Add English-first preference store and language provider`.

## Task 3: Root wiring, chooser, shared shell and privacy controls

**Files:** Modify `app/layout.tsx`, `app/_components/{AppShell,LanguageChooser,CookieConsent,FocusViewSetting,CampaignDisplays,Ads,RouteLoading,InstallableApp}.tsx`, `ui/components/{ContactInterface,ReferralCapture}.tsx`, `app/{loading,error,not-found}.tsx`, `app/offline/OfflineClient.tsx`, `app/responsive-continuation.css`. Create catalogues `shell.ts`, `privacy.ts` and `__tests__/interface-language-shell.test.ts`. Update existing `simple-privacy-language`, `simple-navigation`, `simple-footer`, `optional-consent`, `campaign-dialog`, `advertising-runtime`, `app-shell-boundaries` tests only where display contracts change.

**Interfaces:** Consumes Tasks 1–2. Preserve `LanguageChooser({path})` compatibility; path no longer builds an external URL. Navigation hrefs and consent/referral values remain unchanged.

- [ ] **Write failing presentation tests:** six options only; English SSR selected; no auto/Go/Google link; all previous private-path cases remain external-translation-free; no header chooser; 44px targets. Existing consent tests must inspect behavioral handlers rather than require literal English JSX.
- [ ] **Run RED:** new shell tests plus `__tests__/simple-privacy-language.test.ts`.
- [ ] **Wire one provider inside root body around the skip link, AppShell and root-level consent/referral/install controls.** Preserve server metadata, JSON-LD, security bootstraps and AppShell scroll behavior. Keep root `lang="en-KE"` in SSR.
- [ ] **Replace chooser behavior with the shared store and shell catalogue.** Render translated labels/help and native language names. Retain the path prop without proxy behavior; provide the storage warning as a status message. Remove the obsolete 96px/Go split control sizing; keep compact wrapping footer controls and focus styles.

```tsx
const {locale,setLocale,persistence}=useInterfaceLanguage();
const t=useMessages(shellMessages);
<select value={locale} aria-label={t('language.label')}
  onChange={event=>setLocale(nativeLocale(event.target.value)??'en')}>
  {INTERFACE_LOCALES.map(code=><option key={code} value={code}>{NATIVE_NAMES[code]}</option>)}
</select>
```

Export `NATIVE_NAMES` from `locale.ts`: English, Kiswahili, Français, 简体中文, Русский, Español. Catalogue seed keys `language.label` are respectively Language, Lugha, Langue, 语言, Язык, Idioma. Expand typed keys from each owned component's actual factory copy; never map arbitrary incoming text by English string.

- [ ] **Translate shared nav/footer/privacy/feedback labels and disclosure text.** Keep campaign creative data original, referral IDs untouched and optional tracking opt-in unchanged. Existing menu arrays retain hrefs; add stable label-key maps rather than translate every string value in the arrays.
- [ ] **Preserve minimal root-fatal fallback:** `app/global-error.tsx` stays English with its own `html lang`; it cannot assume the failed root provider. Under normal root, error/not-found/loading/offline controls use the feature catalogue. No fatal-error initialization of translations or storage is required.
- [ ] **Run focused GREEN and privacy/scroll tests.** Record static SSR markup before/after for default English and compare real destinations/consent handlers. Do not weaken auth, consent or retired-renderer assertions to accept a text change.
- [ ] **Commit** with message `Wire native language selection through shared customer controls`.

## Task 4: Marketing and business-page factory copy

**Files:** Create `ui/i18n/catalogues/marketing.ts` and `__tests__/interface-language-marketing.test.ts`. Modify the live marketing portions of `ui/components/{Site,HomeDiscovery,HeroMotion,ExperienceEnhancements,ExperiencePage,PortfolioExperience,PortfolioReconstruction,ClientsPortfolio,PresenterProfiles,ShowcaseShelf}.tsx`, `app/partners/page.tsx`, `app/press/page.tsx`. Source/data adapters `RenderedPage.tsx`, `HostedSite.tsx` change only if necessary to distinguish factory versus published CMS copy.

**Interfaces:** Consumes typed `useMessages`/`MessageText` and `OriginalContent`. Produces no backend or CMS schema change. Shared `ContactInterface.tsx` footer remains Task 3-owned until Task 7 changes its form.

- [ ] **Write failing six-locale component tests:** factory home/business headings change, while a published CMS title/FAQ/biography with identical-looking English remains exactly original. Keep Color Blast four IDs, previews/not-on-sale status and links unchanged. Add this boundary assertion:

```tsx
const source='Owner approved headline';
const html=renderToStaticMarkup(<OriginalContent>{source}</OriginalContent>);
expect(html).toContain(source);
expect(html).toContain('lang="en-KE"');
```

- [ ] **Run RED:** new marketing tests plus `homepage-front-door`, `website-public-content` and `presenter-biography` tests.
- [ ] **Convert each listed live component's factory text into literal typed message keys.** Preserve English source copy verbatim. Use stable semantic keys, not translated strings as component keys. Default FAQ questions/answers get complete catalogues; published CMS FAQs remain original with source-language marking.

```tsx
const t=useMessages(marketingMessages);
return <h2>{publishedCopy
  ?<OriginalContent inline>{publishedCopy.title}</OriginalContent>
  :t('home.eventsHeading')}</h2>;
```

Choose inline semantic spans for original headings rather than invalid block nesting. All source records and reads stay on their current side of server/client boundaries.

- [ ] **Add localized leaves to server-only partner/press factory headings/actions.** Do not mark whole pages client-side or import database/session functions into client bundles.
- [ ] **Run GREEN:** the new suite plus `home-discovery`, `home-sections-recovery`, `homepage-energy`, `clients-archive-recovery`, `showcase-shelves` and public-content tests. Review every authored versus factory decision against the source.
- [ ] **Commit** with message `Localize public marketing controls without rewriting owner content`.

## Task 5: Event, calendar, news and media presentation

**Files:** Create catalogues `discovery.ts`, `media.ts` and `__tests__/interface-language-discovery.test.ts`. Modify live controls in `ui/components/{EventDiscovery,EventPosterCard,EventPlacements,TourTimeline,NewsroomIndex,MediaLibrary,ExperienceRails,ReelsFeed,MediaCaptions,ShareActions,PublicationDate}.tsx`; `app/_components/{EventCalendar,PhotoGallery,ShareBar,PartnerEventDetails,InformationalEventDetails,PartnerEventPortfolio,EventArtwork,PublishedGallery,ArticleText}.tsx`; server leaves in `app/blog/[slug]/page.tsx`, `app/events/[slug]/page.tsx` and relevant gallery routes.

**Interfaces:** Consumes Task 1 display formatters and Tasks 2–3 context/leaves. Do not localize query/filter values, lifecycle codes, event dates, article selectors or public eligibility.

- [ ] **Write failing tests for translated controls and untouched content.** Snapshot article source blocks separately; preserve headline/body/AI disclosure/caption/credit bytes, and track transcript `lang`/`srcLang` from its existing caption language. Exercise locale change while a media overlay is open.
- [ ] **Run RED:** new discovery tests plus `publication-date`, `tour-calendar`, `partner-event-page`, `media-caption-access` tests.
- [ ] **Apply localized display maps around existing status/filter values.** Use canonical values such as `upcoming` as keys in state/query strings; only option labels change. Bind factory admission/status labels to message keys rather than translate arbitrary event descriptions.

```tsx
<option value="upcoming">{t('events.upcoming')}</option>
<time dateTime={eventDay}>{formatCalendarDay(eventDay,locale)??t('events.dateUnconfirmed')}</time>
```

- [ ] **Wrap original news/gallery/event/media blocks and add localized factory controls.** Keep server data/metadata functions server-side. Respect caption language and do not claim translated transcripts or media captions.
- [ ] **Keep download/embedded boundaries explicit.** ICS and JSON exports retain original event data/protocols; label the calendar download as original-language content. Browser media controls, YouTube and other embeds remain browser/provider-controlled.
- [ ] **Run GREEN:** new tests plus `discovery-filter-calendar`, `event-category-discovery`, `owned-event-presentation`, `event-placements`, `newsroom-index`, `news-runtime`, `published-gallery`, `media-overlay-lifecycle` tests. Confirm event sequence and date-only days are unchanged across selected locales.
- [ ] **Commit** with message `Localize discovery and media controls with stable event and article data`.

## Task 6: Commerce, marketplace and design previews

**Files:** Create `ui/i18n/catalogues/commerce.ts` and `__tests__/interface-language-commerce.test.ts`. Modify `app/_components/{LiveCommerce,ShopCatalogueView,ProductPurchase,ProductGallery,ProductReviewForm}.tsx`; `app/_components/merch/{ColorBlastShop,DesignBag,GeneratedProductImage,MerchProductGallery,MerchZoom}.tsx`; `app/marketplace/[eventId]/BuyBox.tsx`; server factory leaves in `app/shop/[id]/page.tsx`, `app/shop/lookbook/page.tsx`, `app/marketplace/page.tsx`, `app/marketplace/[eventId]/page.tsx`.

**Interfaces:** Uses existing cart/attempt/quote/payment APIs unchanged. No writes to `live-cart.ts`, `checkout-attempt.ts`, inventory/catalogue/fulfillment/provider settings unless a proven localization-only seam is needed and reviewed.

- [ ] **Write failing tests for translated factory warnings/actions and stable commerce values.** Preserve preview-only text meaning in all six catalogues. Test zero/fractional KES formatting, original SKU/variant/personalization strings and unchanged underlying total. Include a filled form with an existing error and saved quote/attempt.
- [ ] **Run RED:** new tests plus `shop-catalogue-view`, `approved-product-page`, `commerce-hydration-shell`, `color-blast-release` tests.
- [ ] **Translate display labels and map errors to stable keys/parameters.** Do not store already-translated UI error sentences as the only state; switching must translate an error already on screen. Known safe codes map to catalogue keys; unknown errors use a localized generic error, not raw provider text.

```tsx
const [issue,setIssue]=useState<{key:'checkout.unavailable';values?:MessageValues}|null>(null);
const t=useMessages(commerceMessages);
return issue?<p role="alert">{t(issue.key,issue.values)}</p>:null;
```

Use the actual complete key union in implementation, with a separate safe code-to-key map. Do not change server error codes or transaction payloads.

- [ ] **Translate the remaining listed commerce leaves.** Preserve numeric input values, product IDs, variant values, design-bag data, preview image addresses and all cart/quote/payment effect dependencies. Add a compact local chooser only where no shared chooser is available. SVG titles/options use text-only translations.
- [ ] **Run GREEN:** existing `live-cart`, `checkout-recovery-client`, `checkout-quote`, `checkout-fulfillment`, `shop-discovery`, `verified-purchase-reviews` tests plus new commerce tests. Browser fixture checks in Task 8 must prove that switching creates no new transaction POST and no form remount.
- [ ] **Commit** with message `Localize commerce presentation without changing transaction state`.

## Task 7: Forms, accounts, document HTML, organizer entry and help

**Files:** Create catalogues `forms.ts`, `account.ts`, `documents.ts`, `help.ts`, `organizer-auth.ts`; create `__tests__/interface-language-customer-forms.test.ts`, `__tests__/interface-language-document-html.test.ts`.

Modify live controls in `app/_components/{BookingForm,CustomerFulfillment,GoogleSignIn,PrintDocumentButton,LegalPage}.tsx`, `ui/components/{ContactInterface,NotificationPreferences,AffiliateProgramme}.tsx`, `app/account/AccountApp.tsx`, `app/pay/success/PaymentStatus.tsx`; server leaves in `app/book/status/page.tsx`, `app/receipt/[id]/page.tsx`, `app/tickets/[orderId]/page.tsx`, `app/t/[code]/page.tsx`, `app/verify/[serial]/page.tsx`, `app/verify/order/[id]/page.tsx`, `app/verify/ticket/[code]/page.tsx`, `app/accessibility/page.tsx`, `app/international/page.tsx`, `app/ticketing/page.tsx`, `app/welcome/[language]/page.tsx`; coverage notices only in `lib/welcome-languages.ts`.

Public organizer entry forms are covered: `app/organizer/login/LoginForm.tsx`, `app/organizer/signup/SignupForm.tsx`, `app/organizer/forgot/ForgotForm.tsx`, `app/organizer/reset/ResetForm.tsx`, `app/organizer/verify/VerifyForm.tsx`, and their matching page.tsx files. Shared `app/organizer/ui.tsx` participates. Private organizer dashboard/event editors remain English.

**Interfaces:** Uses MessageText/OriginalContent and stable status/error maps. Server auth, signed access, entitlement, validation and data selectors remain unchanged. Server email/PDF generation is not imported into client leaves.

- [ ] **Write failing tests:** fields and an already-visible error change language without changing input values; original names/terms/references retain exact text; standalone document HTML retains access guards and has a local chooser; staff pages retain English without clearing the customer preference.
- [ ] **Run RED:** new tests plus `account-state`, `payment-presentation`, `document-access`, `ticket-verify-boundary`, `ticketing-guide` tests.
- [ ] **Convert form/account/status factory copy using typed keys and stable error/status parameters.** Include affiliate application/earnings controls, notification preferences, booking status, payment polling and tracking states. Keep payloads, consent booleans, phone/email/reference values and recovery/idempotency keys unchanged.
- [ ] **Add client leaves and local chooser to standalone customer documents.** Do not move access checks/data reads to the browser. Preserve safe ticket/receipt data as original values; use the declared currency/time formatters for display only. Print actions localize HTML controls, not server PDF content.
- [ ] **Convert public organizer entry controls and help wrappers.** Provider-rendered Google UI stays provider-controlled; only first-party errors/help translate. Keep all private editors/dashboard text English with appropriate language declarations.
- [ ] **Refresh obsolete factory coverage disclosures only.** All six welcome scope notices and international/accessibility notices must accurately distinguish native interface from original article/legal/PDF/provider content. Preserve welcome introductory facts, route metadata/hreflang and owner-authored legal/affiliate terms. No CMS/article mutation or new translated legal claim.
- [ ] **Run GREEN:** new tests plus `auth-client-recovery`, `customer-account-security`, `contact-enquiry-route`, `affiliate-programme`, `order-status-privacy`, `document-payment-guards`, `support-copy-clarity`, `international-readiness` tests. Review remaining English as declared original/fallback, not unexplained omissions.
- [ ] **Commit** with message `Localize customer forms and document controls with source-language boundaries`.

## Task 8: Coverage, real browser regression and release evidence

**Files:** Create `docs/i18n/surfaces.json`, `scripts/interface-language-coverage.mjs`, `scripts/interface-language-regression.mjs`, `__tests__/interface-language-source-boundaries.test.ts`, `__tests__/interface-language-catalogues.test.ts`; update `scripts/page-entry-navigation-regression.mjs`, docs/API notes and the existing release markers for this release only.

**Interfaces:** Consumes every preceding catalogue and route mapping. The Node checker reads source with installed TypeScript AST tooling, not unresolved runtime TS/alias imports. Vitest imports each feature catalogue directly for integrity checks. Application root must not import the coverage registry or an all-catalogues barrel.

- [ ] **Write failing inventory/integrity tests.** Registry entries bind each live file/route above to a catalogue, test and explicit original-content classification. Extract JSX text and text-bearing attributes with installed TypeScript AST tooling; report unclassified factory strings. Audit state strings, prop arrays and dynamic status labels separately. No broad “allow all English in this file” suppression.
- [ ] **Run RED:** new coverage tests/checker against the incomplete registry; capture actual missing-surface failures.
- [ ] **Complete the registry and dev-only checker.** Include each live surface from Tasks 3–7, shared referral/advertisement labels and declared global-error/export/provider/staff boundaries. Do not restore unused Newsletter/BookingInvitation/legacy renderer code. The checker guards regressions; it does not certify translation quality.
- [ ] **Implement browser cases against a frozen real Worker bundle using existing scripts/serve-flow-runtime.mjs.** Use fictional intercepted API fixtures for positive account/document/order states and reject non-allowlisted writes. Never fabricate production auth. Keep before/after screenshots and request logs under `/workspace/artifacts/ugt-english-first-20261026`.

```js
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4184';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({locale:'fr-FR',viewport:{width:390,height:900}});
const page=await context.newPage();
await page.goto(origin+'/');
await page.waitForFunction(()=>document.documentElement.lang==='en-KE');
const picker=page.locator('[data-language-control] select').first();
await picker.focus();await picker.selectOption('fr');
await page.waitForFunction(()=>document.documentElement.lang==='fr');
assert.equal(await picker.evaluate(el=>document.activeElement===el),true);
await page.reload();
await page.waitForFunction(()=>document.documentElement.lang==='fr');
assert.equal(await page.locator('html').getAttribute('lang'),'fr');
await browser.close();
```

The example is loopback-only; wrap browser lifetime in try/finally in the runner. Networked live checks preserve the inherited proxy, as existing harnesses do. Browser matrix: all six choices, fresh French-browser English default, explicit English reset, migrated legacy clear/reload, two tabs, blocked storage, JS-disabled English, long text at 360/390/768/1440, no external translation traffic, and native picker keyboard/focus. Repeat with visible errors, filled forms, a cart/quote, payment polling, media overlay and standalone document controls. Compare before/after payload/state and require no new transaction writes. Fixture mode must reject non-loopback origins. Positive server-protected document coverage uses dependency-mocked server tests/local component fixtures; browser interception is not server-authentication proof. Verify real production denials read-only.

- [ ] **Set the release marker before final checks:** use `english-first-interface-20261026-v1` consistently in `worker-runtime.mjs`, `public/release-client.js`, `public/sw.js`, `__tests__/browser-https-upgrade.test.ts` and `__tests__/edge-public-cache.test.ts`. If release is later, record the actual immutable marker consistently; never reuse a published marker.
- [ ] **Run integrated verification:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run cf:build`, then `npx wrangler deploy --dry-run --outdir /workspace/artifacts/ugt-english-first-20261026/runtime/bundle --keep-vars`. Freeze generated assets beside the bundle and run new/browser plus existing shared-controls/welcome/commerce/auth regressions. Read every command's exit result; document pre-existing lint warnings and skipped environment-dependent tests rather than claiming zero warnings.
- [ ] **Review the actual complete branch.** Require spec coverage, no data/auth/consent/commerce regressions, all supported catalogues complete and no role/provider promises beyond scope. Capture JS size/network deltas and fix avoidable shared-bundle loading before release.
- [ ] **Commit final evidence/docs, create the reviewed PR and attach its URL through the app tool.** Follow normal merge rules and standing Cloudflare release permission; no Vercel, forced checks or direct main push. Compare merged tree to the tested tree before `wrangler deploy --keep-vars`.
- [ ] **Verify production read-only:** real release marker, bindings/cron unchanged, default English and immediate persisted switches, original content/metadata/checkout configuration unchanged by this release, p1–p14 withdrawn and all24 Color Blast previews still honest. Use record-version snapshots and explain legitimate concurrent edits/scheduled publication separately; never overwrite them to force a comparison. Do not perform positive production financial/customer-message tests. Record actual verified limits and hand off to the separate maintenance plan.

## Self-review and handoff

Before execution, the owner reviews this plan and chooses Native or Subagent-driven execution. This plan does not authorize skipping that review. Use the approved execution method across its tasks; source/discovery helpers may remain read-only. Native execution means one implementer and a fresh whole-branch reviewer; subagent-driven execution means one bounded writer plus a fresh task reviewer before the next task.

Completion of this delivery is native interface coverage and its declared original-content boundaries, not translated legal/article bodies, localized server documents or a guarantee of availability/payment acceptance in every country.
