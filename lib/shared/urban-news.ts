export const NEWS_CATEGORIES=['celebrity','music','screen','style','creators','sport','culture'] as const;
export type NewsCategory=typeof NEWS_CATEGORIES[number];
export type NewsProvider='gemini'|'openai'|'qwen'|'nvidia';
export const NEWS_DRAFT_MODELS:Record<NewsProvider,readonly string[]>={nvidia:['nvidia/nemotron-3.5-lightning-30b-a3b'],gemini:['gemini-3.5-flash-lite','gemini-3.8-flash'],openai:['gpt-4.1-mini','gpt-4.1','gpt-5-mini'],qwen:['qwen-flash','qwen3.8-flash']};
export type NewsStage='discovered'|'draft'|'review'|'approved'|'live'|'held'|'retracted'|'archived';
export type NewsVerification='confirmed'|'attributed'|'developing';
export type NewsEvidence={id:string;url:string;publisher:string;title:string;observedAt:string;publishedAt:string|null;excerpt:string;rights:'unknown'|'link_only'|'public_facts'|'owned'|'licensed';role:'primary'|'report';independenceKey:string;checked:boolean};
export type UrbanNewsDraft={headline:string;dek:string;body:string[];category:NewsCategory;country:string;verification:NewsVerification;subjectKind:'public_figure'|'organization'|'unknown';risk:'routine'|'sensitive'|'unknown';evidence:NewsEvidence[];claims:{text:string;evidenceIds:string[]}[];image:string;imageAlt:string;imageRights:'none'|'owned'|'licensed';author:string;disclosure:string};
export type DiscoveredNews={url:string;title:string;publisher:string;country:string;language:string;observedAt:string;provider:'gdelt'|'manual'|'apple_chart'|'publisher_feed'|'market_chart'};
export type UrbanNewsItem={id:string;revision:number;draftHash:string;liveRevision:number|null;stage:NewsStage;draft:UrbanNewsDraft;createdAt:string;updatedAt:string;slug:string|null;publishedAt:string|null;correctionNote:string|null};
export type NewsPublication={id:string;expectedRevision:number;expectedLiveRevision:number|null;approvedHash:string;scheduledAt?:string;correctionNote?:string;checks:{facts:boolean;rights:boolean;attribution:boolean;sensitiveNotes?:string}};
export type UrbanNewsOverview={items:UrbanNewsItem[];nextCursor:string|null;counts:Record<NewsStage,number>};
export type UrbanNewsConfig={discoveryEnabled:boolean;draftingEnabled:boolean;provider:NewsProvider;model:string;dailyDraftLimit:number;dailyDiscoveryLimit:number;termsConfirmed:boolean;parallelProviders?:NewsProvider[];voice?:string;dailyMarketTarget?:number};
export type NewsConfigState={config:UrbanNewsConfig;revision:number};
export type NewsDraftAuthorization={configRevision:number;provider:NewsProvider;model:string;mode:'manual'|'scheduled'};
export type NewsJobResult={ok:boolean;state:'complete'|'prepared'|'processing'|'unknown'|'blocked'|'failed';code?:string;added?:number;duplicates?:number;drafted?:number;released?:number;id?:string};
export type NewsProviderReadiness={storageAvailable:boolean;providers:Record<NewsProvider,{configured:boolean;keySource:'managed'|'environment'|'none'}>;discoveryAvailable:boolean;draftsUsedToday:number;discoveriesUsedToday:number;lastRun:{at:string;state:string;code:string|null}|null;budget?:UrbanNewsBudget};
export type PublicNewsSource={id:string;url:string;title:string;publisher:string;publishedAt:string|null};

/** Reserved USD cents are conservative planning allowances, NOT provider invoices. */
export type UrbanNewsBudget={monthlyLimitCents:number;reservedCents:number;revision:number;enabledProviders:Record<NewsProvider,boolean>};
