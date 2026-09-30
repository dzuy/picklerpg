import type {PackId} from './pack-catalog';
export type PremiumSource='revenuecat'|'stripe'|'complimentary';
export interface PremiumStatus {
 sandbox?:boolean;
 ownedPacks:PackId[];
 enforced:boolean;
 sources:Array<{source:PremiumSource;packId:PackId}>;
 appleReady:boolean;
 webReady:boolean;
 availablePacks:PackId[];
 admin:boolean;
 privacyUrl:string|null;
 termsUrl:string|null;
}
