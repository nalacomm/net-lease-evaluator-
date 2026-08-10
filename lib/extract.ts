import { askJson } from "./anthropic";

export interface TenantLeaseRowExtracted {
  tenantName: string;
  suite: string | null;
  squareFeet: number | null;
  annualRent: number;
  remainingYears: number;
  leaseType: string | null;
  bumpPercent: number | null;
  creditType: string | null;
}

export interface ExtractedDeal {
  address: string | null;
  city: string | null;
  state: string | null;
  assetType: string | null;
  tenantName: string | null;
  operatorName: string | null;
  operatorUnitCount: number | null;
  guarantyType: string | null;
  askingPrice: number | null;
  noi: number | null;
  capRateAsking: number | null;
  leaseType: string | null;
  termRemainingYears: number | null;
  bumpStructure: string | null;
  bumpPercent: number | null;
  constructionYear: number | null;
  buildingSize: number | null;
  hhi1Mile: number | null;
  hhi3Mile: number | null;
  population1Mile: number | null;
  sourceBroker: string | null;
  sourcePlatform: string | null;
  // multi-tenant / retail plaza fields
  grossLeasableArea: number | null;
  numberOfTenants: number | null;
  vacancyRate: number | null;
  anchorTenant: string | null;
  walt: number | null;
  rentRoll: TenantLeaseRowExtracted[] | null;
  // land / all categories
  lotSize: number | null;
  zoning: string | null;
  entitlements: string | null;
}

export interface ExtractResult {
  deal: ExtractedDeal;
  inferredFields: string[];
  missingFields: string[];
  confidenceLevel: "high" | "medium" | "low";
  notes: string;
}

const SYSTEM_NET_LEASE = `You are a commercial real estate net-lease analyst. Extract structured deal data from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

const SYSTEM_OTHER_CRE = `You are a commercial real estate analyst. Extract structured deal data from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

const SYSTEM_MULTI_TENANT = `You are a commercial real estate analyst specializing in multi-tenant properties. Extract structured deal data including the rent roll from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

const SYSTEM_LAND = `You are a commercial real estate analyst specializing in land and development sites. Extract structured deal data from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

const SYSTEM_RETAIL_PLAZA = `You are a commercial real estate analyst specializing in retail shopping centers and plazas. Extract structured deal data including the rent roll from listing text. Return ONLY valid JSON, no prose, no markdown fences.`;

export async function extractDeal(content: string, category?: string): Promise<ExtractResult> {
  const isOtherCre = category === "other_cre";
  const isMultiTenant = category === "multi_tenant";
  const isLand = category === "land";
  const isRetailPlaza = category === "retail_plaza";

  if (isMultiTenant) {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Extract multi-tenant commercial real estate fields from the source below. Today's date is ${today}.

Enums:
- assetType: one of "retail","office","industrial","medical","mixed_use","strip_center","power_center","lifestyle_center","other"
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"
- creditType per tenant: one of "national","regional","local" (use "national" for publicly traded or investment-grade chains, "regional" for multi-state operators, "local" for single-location/independent)

Rules:
- Numbers only for money fields (no $ or % symbols).
- vacancyRate as percent e.g. 5.0 means 5%.
- remainingYears = years from today to lease expiration (compute from dates if needed, list in inferredFields if computed).
- For the rentRoll, extract every tenant you can find. annualRent and remainingYears are REQUIRED for each row; use null for optional fields you cannot find.
- walt = income-weighted average remaining term: Σ(remainingYears × annualRent) ÷ totalAnnualRent. Compute it if you have the rent roll. List in inferredFields if computed.
- Use null for anything not present. Do not invent values.
- Key fields: address, askingPrice, noi/capRateAsking, grossLeasableArea, rentRoll. Flag these in missingFields if absent.
- confidenceLevel: "high" if rent roll, price, and NOI/cap rate are all present; "medium" if 1-2 are missing; "low" if 3+ missing.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "tenantName": null,
    "operatorName": null, "operatorUnitCount": null, "guarantyType": null,
    "askingPrice": null, "noi": null, "capRateAsking": null,
    "leaseType": null, "termRemainingYears": null, "bumpStructure": null, "bumpPercent": null,
    "constructionYear": null, "buildingSize": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null,
    "grossLeasableArea": null, "numberOfTenants": null, "vacancyRate": null,
    "walt": null,
    "rentRoll": []
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 14000)}`;

    return askJson<ExtractResult>(prompt, { system: SYSTEM_MULTI_TENANT, maxTokens: 2000 });
  }

  if (isLand) {
    const prompt = `Extract land / development site fields from the source below. This is a land deal — no tenants, no lease income, no DSCR. Do not flag income fields as missing.

Enums:
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"
- entitlements: one of "raw","partially_entitled","fully_entitled","permitted" — use null if unknown

Rules:
- Numbers only for money fields (no $ or % symbols).
- lotSize in acres.
- Use null for anything not present. Do not invent values.
- Key fields: address, askingPrice, lotSize, zoning. Flag only these if absent.
- confidenceLevel: "high" if address, price, and lotSize are all explicit; "medium" if 1 is inferred; "low" if 2+ missing.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "askingPrice": null,
    "lotSize": null,
    "zoning": null,
    "entitlements": null,
    "buildingSize": null,
    "constructionYear": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 12000)}`;

    return askJson<ExtractResult>(prompt, { system: SYSTEM_LAND, maxTokens: 1000 });
  }

  if (isRetailPlaza) {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Extract retail plaza / shopping center fields from the source below. Today's date is ${today}.

Enums:
- assetType: one of "strip_center","power_center","lifestyle_center","neighborhood_center","other"
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"
- creditType per tenant: one of "national","regional","local"

Rules:
- Numbers only for money fields (no $ or % symbols).
- vacancyRate as percent e.g. 5.0 means 5%.
- remainingYears = years from today to lease expiration (compute from dates if needed, list in inferredFields if computed).
- Extract every tenant you can find. annualRent and remainingYears are REQUIRED per row; null for optional fields.
- walt = income-weighted average remaining term: Σ(remainingYears × annualRent) ÷ totalAnnualRent. Compute if rent roll available. List in inferredFields if computed.
- anchorTenant = largest or most prominent tenant by SF or brand recognition.
- Use null for anything not present. Do not invent values.
- Key fields: address, askingPrice, noi/capRateAsking, grossLeasableArea, rentRoll, anchorTenant. Flag these in missingFields if absent.
- confidenceLevel: "high" if rent roll, price, and NOI/cap rate present; "medium" if 1-2 missing; "low" if 3+ missing.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "tenantName": null, "anchorTenant": null,
    "askingPrice": null, "noi": null, "capRateAsking": null,
    "constructionYear": null, "buildingSize": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null,
    "grossLeasableArea": null, "numberOfTenants": null, "vacancyRate": null,
    "walt": null,
    "rentRoll": []
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 14000)}`;

    return askJson<ExtractResult>(prompt, { system: SYSTEM_RETAIL_PLAZA, maxTokens: 2000 });
  }

  if (isOtherCre) {
    const prompt = `Extract general commercial real estate fields from the source below. This is NOT a net lease property — do not look for or flag NNN fields (NOI, cap rate, lease type, guaranty, term, operator info) as missing.

Enums:
- assetType: one of "eclc","qsr","pharmacy","medical","dollar_store","retail","restaurant","other"
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"

Rules:
- Numbers only for money fields (no $ or % symbols).
- Use null for anything not present. Do not invent values.
- Track which fields were INFERRED (not explicitly stated) and which key fields are MISSING.
- Key fields for this deal type: address, assetType, askingPrice. Flag only these if absent.
- confidenceLevel: "high" if address, asset type, and price are all explicit; "medium" if 1 is inferred; "low" if 2+ are missing.
- Leave all NNN fields (noi, capRateAsking, leaseType, termRemainingYears, bumpStructure, bumpPercent, guarantyType, operatorName, operatorUnitCount) as null — do not list them in missingFields.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "tenantName": null, "operatorName": null, "operatorUnitCount": null, "guarantyType": null,
    "askingPrice": null, "noi": null, "capRateAsking": null,
    "leaseType": null, "termRemainingYears": null, "bumpStructure": null, "bumpPercent": null,
    "constructionYear": null, "buildingSize": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 12000)}`;

    return askJson<ExtractResult>(prompt, { system: SYSTEM_OTHER_CRE, maxTokens: 1000 });
  }

  const prompt = `Extract net lease deal fields from the source below.

Enums:
- assetType: one of "eclc","qsr","pharmacy","medical","dollar_store","retail","restaurant","other"
- leaseType: one of "absolute_nnn","nnn","modified_nnn","gross"
- guarantyType: one of "corporate","multi_unit_franchisee","single_personal"
- sourcePlatform: one of "costar","loopnet","crexi","direct","other"

Rules:
- Numbers only for money/percent fields (no $ or % symbols). capRateAsking and bumpPercent as plain numbers (e.g. 7.5 means 7.5%).
- Use null for anything not present. Do not invent values.
- termRemainingYears may be derived from lease expiration vs today; if so list it in inferredFields.
- Track which fields were INFERRED (not explicitly stated) and which key fields are MISSING.
- confidenceLevel: "high" if all key fields (price, noi/capRate, leaseType, term, guaranty) are explicit; "medium" if 1-2 inferred; "low" if 3+ inferred or missing.

Return JSON exactly:
{
  "deal": {
    "address": null, "city": null, "state": null, "assetType": null,
    "tenantName": null, "operatorName": null, "operatorUnitCount": null, "guarantyType": null,
    "askingPrice": null, "noi": null, "capRateAsking": null,
    "leaseType": null, "termRemainingYears": null, "bumpStructure": null, "bumpPercent": null,
    "constructionYear": null, "buildingSize": null,
    "hhi1Mile": null, "hhi3Mile": null, "population1Mile": null,
    "sourceBroker": null, "sourcePlatform": null
  },
  "inferredFields": [],
  "missingFields": [],
  "confidenceLevel": "low",
  "notes": ""
}

SOURCE:
${content.slice(0, 12000)}`;

  return askJson<ExtractResult>(prompt, { system: SYSTEM_NET_LEASE, maxTokens: 1500 });
}
