import "server-only";
import { prisma } from "@/lib/db";
import type { BiddingRules } from "@/lib/bidding";
import { DEFAULT_CURRENCY } from "@/lib/money";

export interface AppSettings {
  startingBidCents: number;
  minIncrementCents: number;
  takeTopIncrementCents: number;
  maxBidCents: number;
  currency: string;
  todayWindowHours: number;
  dailyBoardEnabled: boolean;
  listingsEnabled: boolean;
  biddingEnabled: boolean;
  autoRefundVoided: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  startingBidCents: 1000, // $10
  minIncrementCents: 100, // $1
  takeTopIncrementCents: 500, // $5 more than #1 to take #1
  maxBidCents: 99999900, // $999,999
  currency: DEFAULT_CURRENCY,
  todayWindowHours: 24,
  dailyBoardEnabled: true,
  listingsEnabled: true,
  biddingEnabled: true,
  autoRefundVoided: true,
};

const CACHE_TTL_MS = 10_000;
let cache: { value: AppSettings; at: number } | null = null;

export async function getSettings(force = false): Promise<AppSettings> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULT_SETTINGS },
    update: {},
  });
  const value: AppSettings = {
    startingBidCents: row.startingBidCents,
    minIncrementCents: row.minIncrementCents,
    takeTopIncrementCents: row.takeTopIncrementCents,
    maxBidCents: row.maxBidCents,
    currency: row.currency,
    todayWindowHours: row.todayWindowHours,
    dailyBoardEnabled: row.dailyBoardEnabled,
    listingsEnabled: row.listingsEnabled,
    biddingEnabled: row.biddingEnabled,
    autoRefundVoided: row.autoRefundVoided,
  };
  cache = { value, at: Date.now() };
  return value;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULT_SETTINGS, ...patch },
    update: patch,
  });
  cache = null;
  return getSettings(true);
}

export function invalidateSettingsCache(): void {
  cache = null;
}

export function toBiddingRules(s: AppSettings): BiddingRules {
  return {
    startingBidCents: s.startingBidCents,
    minIncrementCents: s.minIncrementCents,
    takeTopIncrementCents: s.takeTopIncrementCents,
    maxBidCents: s.maxBidCents,
  };
}
