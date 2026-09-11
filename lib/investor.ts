import { prisma } from "./prisma";

export async function getActiveInvestor(id?: string) {
  if (id) {
    return prisma.investor.findUnique({
      where: { id },
      include: { buyBoxes: true },
    });
  }
  return prisma.investor.findFirst({
    orderBy: { createdAt: "asc" },
    include: { buyBoxes: true },
  });
}

export async function getAllInvestors() {
  return prisma.investor.findMany({
    orderBy: { createdAt: "asc" },
    include: { buyBoxes: true, _count: { select: { deals: true } } },
  });
}

/**
 * Picks the best-matching buy box for a given asset type.
 * Prefers a specific box (appliesTo includes the asset type),
 * then falls back to the catch-all box (empty appliesTo), then first.
 */
export function pickBuyBox<T extends { appliesTo: string[] }>(
  buyBoxes: T[],
  assetType?: string | null
): T | null {
  if (!buyBoxes.length) return null;
  if (assetType) {
    const specific = buyBoxes.find((bb) => bb.appliesTo.includes(assetType));
    if (specific) return specific;
  }
  return buyBoxes.find((bb) => bb.appliesTo.length === 0) ?? buyBoxes[0];
}

/**
 * Picks the best-matching tenant requirements for a given site type.
 */
export function pickRequirements<T extends { appliesTo: string[] }>(
  requirements: T[],
  siteType?: string | null
): T | null {
  if (!requirements.length) return null;
  if (siteType) {
    const specific = requirements.find((r) => r.appliesTo.includes(siteType));
    if (specific) return specific;
  }
  return requirements.find((r) => r.appliesTo.length === 0) ?? requirements[0];
}
