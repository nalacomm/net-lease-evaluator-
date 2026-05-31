import { prisma } from "./prisma";

/**
 * Returns the active investor. Single-broker tool defaults to the first
 * investor (Mark Coleman seeded). Optionally pass an id.
 */
export async function getActiveInvestor(id?: string) {
  if (id) {
    return prisma.investor.findUnique({
      where: { id },
      include: { buyBox: true },
    });
  }
  return prisma.investor.findFirst({
    orderBy: { createdAt: "asc" },
    include: { buyBox: true },
  });
}

export async function getAllInvestors() {
  return prisma.investor.findMany({
    orderBy: { createdAt: "asc" },
    include: { buyBox: true, _count: { select: { deals: true } } },
  });
}
