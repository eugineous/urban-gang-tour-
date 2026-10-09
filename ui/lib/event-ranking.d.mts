export const RANKING_VERSION:string;
export type RankContext={now?:number;region?:string;query?:string;mode?:string;diversify?:boolean};
export function entertainmentTier(event:Record<string,any>):number;
export function reportedSales(event:Record<string,any>,now?:number):number|null;
export function scoreEvent(event:Record<string,any>,context?:RankContext):{eligible:boolean;score:number;reasons:string[]};
export function rankEvents<T extends Record<string,any>>(events:T[],context?:RankContext):T[];
